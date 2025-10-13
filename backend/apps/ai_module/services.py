from datetime import timedelta
from apps.sales.models import Sale
from apps.products.models import Product
import datetime as dt
import random


def forecast_sales_next_days(product_id: int, days: int = 7):
    qs = Sale.objects.filter(product_id=product_id).order_by('date')
    if not qs.exists():
        # No history for this product: use demand_plan_for_date fallback per day
        today = dt.date.today()
        out = []
        for i in range(1, days + 1):
            target = today + timedelta(days=i)
            try:
                plan = demand_plan_for_date(target_date=target, top_n=None)
                est = next((row['quantity_estimate'] for row in plan if row['product_id'] == product_id), None)
                out.append({
                    'date': target.isoformat(),
                    'quantity_estimate': float(est) if est is not None else 0.0,
                })
            except Exception:
                out.append({'date': target.isoformat(), 'quantity_estimate': 0.0})
        return out

    # Build plain Python series
    series = [{'ds': row['date'], 'y': float(row['quantity_kg'])} for row in qs.values('date', 'quantity_kg')]

    # Try Prophet path (requires pandas)
    try:
        import pandas as pd  # type: ignore
        from prophet import Prophet  # type: ignore

        df = pd.DataFrame(series)
        m = Prophet()
        m.fit(df[['ds', 'y']])
        future = m.make_future_dataframe(periods=days)
        forecast = m.predict(future)
        out = []
        for _, row in forecast.tail(days).iterrows():
            out.append({
                'date': row['ds'].date().isoformat(),
                'quantity_estimate': float(max(row['yhat'], 0)),
            })
        return out
    except Exception:
        pass

    # Fallback: simple linear regression if sklearn/numpy available
    try:
        from sklearn.linear_model import LinearRegression  # type: ignore
        import numpy as np  # type: ignore
        import datetime as dt

        if len(series) == 0:
            # No series despite qs check (defensive)
            today = dt.date.today()
            return [{ 'date': (today + timedelta(days=i+1)).isoformat(), 'quantity_estimate': 0.0 } for i in range(days)]

        if len(series) < 2:
            last_date = series[-1]['ds']
            last_q = series[-1]['y']
            return [{
                'date': (last_date + timedelta(days=i+1)).isoformat(),
                'quantity_estimate': last_q
            } for i in range(days)]

        X = np.array([s['ds'].toordinal() for s in series]).reshape(-1, 1)
        y = np.array([s['y'] for s in series])
        model = LinearRegression().fit(X, y)
        start = series[-1]['ds']
        out = []
        for i in range(1, days+1):
            d = start + timedelta(days=i)
            pred = float(model.predict([[d.toordinal()]])[0])
            out.append({'date': d.isoformat(), 'quantity_estimate': max(pred, 0.0)})
        return out
    except Exception:
        pass

    # Final naive fallback: repeat last known value
    last_q = series[-1]['y']
    start = series[-1]['ds']
    return [{'date': (start + timedelta(days=i+1)).isoformat(), 'quantity_estimate': last_q} for i in range(days)]


def _safe_imports():
    try:
        import pandas as pd  # type: ignore
    except Exception:
        pd = None
    try:
        import numpy as np  # type: ignore
    except Exception:
        np = None
    try:
        from sklearn.linear_model import LinearRegression  # type: ignore
    except Exception:
        LinearRegression = None  # type: ignore
    try:
        from prophet import Prophet  # type: ignore
    except Exception:
        Prophet = None  # type: ignore
    return pd, np, LinearRegression, Prophet


def demand_plan_for_date(target_date: dt.date, top_n: int | None = None):
    """
    Predict demand per product for a specific date.
    Returns a list: [{ product_id, product_name, quantity_estimate, price_estimate, low, high }]
    Uses Prophet if available, else falls back to LinearRegression with date features, else to seasonal averages by weekday/month.
    Monte Carlo: simulate N draws around point estimate with residual std to produce low/high percentiles.
    """
    pd, np, LinearRegression, Prophet = _safe_imports()

    results = []
    products = Product.objects.filter(is_active=True).order_by('name')
    # Preload sales
    sales = Sale.objects.select_related('product').all().order_by('date')
    by_product = {}
    for s in sales:
        by_product.setdefault(s.product_id, []).append(s)

    for p in products:
        series = by_product.get(p.id, [])
        if not series:
            continue

        # Build simple python lists
        dates = [s.date for s in series]
        qtys = [float(s.quantity_kg) for s in series]
        prices = [float(s.unit_price) for s in series]

        # Default price estimate: mean of last 30 entries
        price_est = sum(prices[-30:]) / max(1, len(prices[-30:]))

        # Try Prophet path
        quantity_est = None
        low = None
        high = None
        try:
            if Prophet is not None and pd is not None:
                df = pd.DataFrame({ 'ds': dates, 'y': qtys })
                m = Prophet()
                m.fit(df)
                future = pd.DataFrame({'ds': [pd.Timestamp(target_date)]})
                forecast = m.predict(future)
                yhat = float(forecast['yhat'].iloc[0])
                yhat_lower = float(forecast.get('yhat_lower', [yhat])[0])
                yhat_upper = float(forecast.get('yhat_upper', [yhat])[0])
                quantity_est = max(yhat, 0.0)
                low = max(yhat_lower, 0.0)
                high = max(yhat_upper, 0.0)
        except Exception:
            pass

        # Fallback: Linear Regression with ordinal date
        if quantity_est is None:
            try:
                if LinearRegression is not None:
                    X = [[d.toordinal(), d.weekday()+1, d.month] for d in dates]
                    model = LinearRegression().fit(X, qtys)
                    x_t = [[target_date.toordinal(), target_date.weekday()+1, target_date.month]]
                    pred = float(model.predict(x_t)[0])
                    quantity_est = max(pred, 0.0)

                    # residual std
                    preds = model.predict(X)
                    residuals = [(qtys[i] - preds[i]) for i in range(len(qtys))]
                    sigma = (sum(r*r for r in residuals) / max(1, len(residuals)-1)) ** 0.5
                    # Monte Carlo
                    N = 200
                    samples = [max(random.gauss(quantity_est, sigma), 0.0) for _ in range(N)]
                    samples.sort()
                    low = samples[int(0.1*N)]
                    high = samples[int(0.9*N)]
            except Exception:
                pass

        # Final fallback: seasonal averages by weekday and month
        if quantity_est is None:
            dow = target_date.weekday()
            month = target_date.month
            # Compute averages
            by_dow = {}
            by_month = {}
            for d, q in zip(dates, qtys):
                by_dow.setdefault(d.weekday(), []).append(q)
                by_month.setdefault(d.month, []).append(q)
            avg_dow = sum(by_dow.get(dow, [0])) / max(1, len(by_dow.get(dow, [0])))
            avg_month = sum(by_month.get(month, [0])) / max(1, len(by_month.get(month, [0])))
            quantity_est = max((avg_dow + avg_month) / 2.0, 0.0)
            # Uncertainty from global std
            import statistics
            sigma = statistics.pstdev(qtys) if len(qtys) > 1 else 0.0
            low = max(quantity_est - 1.28*sigma, 0.0)
            high = max(quantity_est + 1.28*sigma, 0.0)

        results.append({
            'product_id': p.id,
            'product_name': p.name,
            'quantity_estimate': round(quantity_est, 3),
            'price_estimate': round(price_est, 3),
            'low': round(low if low is not None else quantity_est, 3),
            'high': round(high if high is not None else quantity_est, 3),
        })

    # Sort by quantity desc and limit
    results.sort(key=lambda x: x['quantity_estimate'], reverse=True)
    if top_n:
        results = results[:top_n]
    return results

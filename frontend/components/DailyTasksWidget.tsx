import { useState, useEffect } from 'react'
import { Box, Paper, Typography, List, ListItem, ListItemText, Checkbox, IconButton, TextField, Button, Divider, Collapse } from '@mui/material'
import { Delete, Add, ExpandMore, ExpandLess } from '@mui/icons-material'

interface DailyTask {
    id: number
    title: string
    completed: boolean
    created_at: string
    completed_at: string | null
}

export default function DailyTasksWidget() {
    const [tasks, setTasks] = useState<DailyTask[]>([])
    const [newTask, setNewTask] = useState('')
    const [showCompleted, setShowCompleted] = useState(false)

    useEffect(() => {
        fetchTasks()
    }, [])

    const fetchTasks = async () => {
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
            const res = await fetch(`${apiBase}/daily-tasks/`)
            const data = await res.json()
            setTasks(data)
        } catch (error) {
            console.error('Error fetching tasks:', error)
        }
    }

    const handleAddTask = async () => {
        if (!newTask.trim()) return
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
            const res = await fetch(`${apiBase}/daily-tasks/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTask, completed: false })
            })
            if (res.ok) {
                setNewTask('')
                fetchTasks()
            }
        } catch (error) {
            console.error('Error adding task:', error)
        }
    }

    const handleToggleTask = async (taskId: number) => {
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
            const res = await fetch(`${apiBase}/daily-tasks/${taskId}/toggle/`, {
                method: 'PATCH'
            })
            if (res.ok) {
                fetchTasks()
            }
        } catch (error) {
            console.error('Error toggling task:', error)
        }
    }

    const handleDeleteTask = async (taskId: number) => {
        if (!confirm('Supprimer cette tâche ?')) return
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
            const res = await fetch(`${apiBase}/daily-tasks/${taskId}/`, {
                method: 'DELETE'
            })
            if (res.ok) {
                fetchTasks()
            }
        } catch (error) {
            console.error('Error deleting task:', error)
        }
    }

    const incompleteTasks = tasks.filter(t => !t.completed)
    const completedTasks = tasks.filter(t => t.completed)

    return (
        <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                ✓ À faire aujourd'hui
            </Typography>

            {/* Incomplete Tasks */}
            <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
                {incompleteTasks.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                        Aucune tâche en cours
                    </Typography>
                ) : (
                    incompleteTasks.map(task => (
                        <ListItem
                            key={task.id}
                            dense
                            sx={{
                                px: 0,
                                '&:hover .delete-btn': { opacity: 1 }
                            }}
                        >
                            <Checkbox
                                edge="start"
                                checked={false}
                                onChange={() => handleToggleTask(task.id)}
                                sx={{ py: 0 }}
                            />
                            <ListItemText
                                primary={task.title}
                                sx={{ my: 0 }}
                            />
                            <IconButton
                                size="small"
                                onClick={() => handleDeleteTask(task.id)}
                                className="delete-btn"
                                sx={{ opacity: 0, transition: 'opacity 0.2s' }}
                            >
                                <Delete fontSize="small" />
                            </IconButton>
                        </ListItem>
                    ))
                )}
            </List>

            {/* Completed Tasks Toggle */}
            {completedTasks.length > 0 && (
                <>
                    <Divider sx={{ my: 1 }} />
                    <Button
                        size="small"
                        onClick={() => setShowCompleted(!showCompleted)}
                        endIcon={showCompleted ? <ExpandLess /> : <ExpandMore />}
                        sx={{ textTransform: 'none' }}
                    >
                        Terminées ({completedTasks.length})
                    </Button>
                    <Collapse in={showCompleted}>
                        <List dense>
                            {completedTasks.map(task => (
                                <ListItem
                                    key={task.id}
                                    dense
                                    sx={{
                                        px: 0,
                                        opacity: 0.6,
                                        '&:hover .delete-btn': { opacity: 1 }
                                    }}
                                >
                                    <Checkbox
                                        edge="start"
                                        checked={true}
                                        onChange={() => handleToggleTask(task.id)}
                                        sx={{ py: 0 }}
                                    />
                                    <ListItemText
                                        primary={task.title}
                                        sx={{ my: 0, textDecoration: 'line-through' }}
                                    />
                                    <IconButton
                                        size="small"
                                        onClick={() => handleDeleteTask(task.id)}
                                        className="delete-btn"
                                        sx={{ opacity: 0, transition: 'opacity 0.2s' }}
                                    >
                                        <Delete fontSize="small" />
                                    </IconButton>
                                </ListItem>
                            ))}
                        </List>
                    </Collapse>
                </>
            )}

            {/* Add Task Input */}
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                    size="small"
                    fullWidth
                    placeholder="Ajouter une tâche..."
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                            handleAddTask()
                        }
                    }}
                />
                <IconButton
                    color="primary"
                    onClick={handleAddTask}
                    disabled={!newTask.trim()}
                >
                    <Add />
                </IconButton>
            </Box>
        </Paper>
    )
}

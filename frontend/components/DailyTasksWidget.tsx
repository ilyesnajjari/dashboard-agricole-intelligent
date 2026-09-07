import { useState, useEffect } from 'react'
import { Box, Paper, Typography, List, ListItem, ListItemText, Checkbox, IconButton, TextField, Button, Divider, Collapse, Tooltip } from '@mui/material'
import { Delete, Add, ExpandMore, ExpandLess, Edit, Check, Close, Star, StarBorder } from '@mui/icons-material'

interface DailyTask {
    id: number
    title: string
    completed: boolean
    is_planned_today: boolean
    created_at: string
    completed_at: string | null
}

export default function DailyTasksWidget() {
    const [tasks, setTasks] = useState<DailyTask[]>([])
    const [newTask, setNewTask] = useState('')
    const [showCompleted, setShowCompleted] = useState(false)
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
    const [editingText, setEditingText] = useState('')

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

    const handleTogglePlanned = async (taskId: number) => {
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
            const res = await fetch(`${apiBase}/daily-tasks/${taskId}/toggle_planned/`, {
                method: 'PATCH'
            })
            if (res.ok) {
                fetchTasks()
            }
        } catch (error) {
            console.error('Error toggling planned status:', error)
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

    const handleStartEdit = (task: DailyTask) => {
        setEditingTaskId(task.id)
        setEditingText(task.title)
    }

    const handleCancelEdit = () => {
        setEditingTaskId(null)
        setEditingText('')
    }

    const handleSaveEdit = async (taskId: number) => {
        if (!editingText.trim()) return
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
            const res = await fetch(`${apiBase}/daily-tasks/${taskId}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: editingText })
            })
            if (res.ok) {
                setEditingTaskId(null)
                setEditingText('')
                fetchTasks()
            }
        } catch (error) {
            console.error('Error updating task:', error)
        }
    }

    const incompleteTasks = tasks.filter(t => !t.completed)
    const completedTasks = tasks.filter(t => t.completed)

    const renderTaskItem = (task: DailyTask, isCompleted: boolean) => {
        const isEditing = editingTaskId === task.id

        return (
            <ListItem
                key={task.id}
                dense
                sx={{
                    px: 0,
                    pr: 1, // Add right padding to prevent overlap with scrollbar
                    opacity: isCompleted ? 0.6 : 1,
                    '&:hover .action-btns': { opacity: 1 }
                }}
            >
                <Checkbox
                    edge="start"
                    checked={isCompleted}
                    onChange={() => handleToggleTask(task.id)}
                    sx={{ py: 0 }}
                    disabled={isEditing}
                />
                {!isCompleted && (
                    <Tooltip title={task.is_planned_today ? "Retirer de la sélection du jour" : "Sélectionner pour aujourd'hui"}>
                        <IconButton
                            size="small"
                            onClick={() => handleTogglePlanned(task.id)}
                            color={task.is_planned_today ? "warning" : "default"}
                            sx={{ p: 0.5, mr: 1, opacity: isEditing ? 0 : 1 }}
                            disabled={isEditing}
                        >
                            {task.is_planned_today ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                )}
                {isEditing ? (
                    <TextField
                        size="small"
                        fullWidth
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleSaveEdit(task.id)
                            } else if (e.key === 'Escape') {
                                handleCancelEdit()
                            }
                        }}
                        autoFocus
                        sx={{ mx: 1 }}
                    />
                ) : (
                    <ListItemText
                        primary={task.title}
                        sx={{
                            my: 0,
                            textDecoration: isCompleted ? 'line-through' : 'none',
                            mr: 1,
                        }}
                        primaryTypographyProps={{
                            fontWeight: task.is_planned_today && !isCompleted ? 600 : 400,
                            color: task.is_planned_today && !isCompleted ? 'warning.dark' : 'inherit'
                        }}
                    />
                )}
                <Box className="action-btns" sx={{ display: 'flex', gap: 0.5, opacity: isEditing ? 1 : 0, transition: 'opacity 0.2s' }}>
                    {isEditing ? (
                        <>
                            <IconButton
                                size="small"
                                onClick={() => handleSaveEdit(task.id)}
                                color="primary"
                            >
                                <Check fontSize="small" />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={handleCancelEdit}
                            >
                                <Close fontSize="small" />
                            </IconButton>
                        </>
                    ) : (
                        <>
                            <IconButton
                                size="small"
                                onClick={() => handleStartEdit(task)}
                            >
                                <Edit fontSize="small" />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={() => handleDeleteTask(task.id)}
                            >
                                <Delete fontSize="small" />
                            </IconButton>
                        </>
                    )}
                </Box>
            </ListItem>
        )
    }

    return (
        <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                ✓ À faire aujourd'hui
            </Typography>

            {/* Incomplete Tasks */}
            <List dense sx={{ maxHeight: 300, overflow: 'auto', pr: 1 }}>
                {incompleteTasks.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                        Aucune tâche en cours
                    </Typography>
                ) : (
                    incompleteTasks.map(task => renderTaskItem(task, false))
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
                        <List dense sx={{ pr: 1 }}>
                            {completedTasks.map(task => renderTaskItem(task, true))}
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

// --- DOM Element References ---
const taskInput = document.getElementById('taskInput');
const dueDateInput = document.getElementById('dueDateInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');
const filterAllBtn = document.getElementById('filterAll');
const filterActiveBtn = document.getElementById('filterActive');
const filterCompletedBtn = document.getElementById('filterCompleted');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const activeTasksCountSpan = document.getElementById('activeTasksCount');
const completedTasksCountSpan = document.getElementById('completedTasksCount');
const totalTasksCountSpan = document.getElementById('totalTasksCount');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const body = document.body;

const sortTasksSelect = document.getElementById('sortTasks'); // New reference

// Custom Modal References
const customConfirmModal = document.getElementById('customConfirmModal');
const confirmMessageDiv = document.getElementById('confirmMessage');
const confirmYesBtn = document.getElementById('confirmYesBtn');
const confirmNoBtn = document.getElementById('confirmNoBtn');

// --- Global Variables ---
const LOCAL_STORAGE_KEY = 'advancedTodoList';
const LOCAL_STORAGE_THEME_KEY = 'todoListTheme';
let currentFilter = 'all';
let currentSort = sortTasksSelect.value; // Initialize with default sort option

// --- Helper Functions for Local Storage ---

// Saves the current state of tasks to Local Storage
function saveTasks() {
    const tasks = [];
    taskList.querySelectorAll('li').forEach(listItem => {
        tasks.push({
            id: listItem.dataset.id,
            text: listItem.querySelector('.task-text').textContent,
            completed: listItem.classList.contains('completed'),
            dueDate: listItem.dataset.dueDate,
            timestamp: listItem.dataset.timestamp // Save creation timestamp
        });
    });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
    updateTaskCounts();
    applyFilter(currentFilter);
    // Do not call sortTasksList here, it will be called after loading
}

// Loads tasks from Local Storage and populates the list
function loadTasks() {
    const storedTasks = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedTasks) {
        const tasks = JSON.parse(storedTasks);
        tasks.forEach(task => {
            const newTaskElement = createTaskElement(task.text, task.id, task.completed, task.dueDate, task.timestamp);
            taskList.appendChild(newTaskElement);
        });
    }
    updateTaskCounts();
    loadTheme();
    // Apply the initial sort and filter after all tasks are loaded
    applySort(currentSort); // Apply sort first
    applyFilter(currentFilter); // Then apply filter
}

// --- Task Count Display Function ---
function updateTaskCounts() {
    const totalTasks = taskList.children.length;
    const completedTasks = taskList.querySelectorAll('li.completed').length;
    const activeTasks = totalTasks - completedTasks;

    activeTasksCountSpan.textContent = `Active: ${activeTasks}`;
    completedTasksCountSpan.textContent = `Completed: ${completedTasks}`;
    totalTasksCountSpan.textContent = `Total: ${totalTasks}`;
}


// --- Core Task Management Functions ---

// Generates a unique ID for each task
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Formats a date string for display
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Add 1 day to the date to correctly display the chosen day in local timezone
    // as date input sometimes returns date as previous day if timezone is ahead of UTC
    date.setDate(date.getDate() + 1);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Creates a new task list item HTML element
function createTaskElement(taskText, id = generateUniqueId(), isCompleted = false, dueDate = '', timestamp = Date.now()) { // New timestamp parameter
    const listItem = document.createElement('li');
    listItem.setAttribute('data-id', id);
    listItem.setAttribute('data-due-date', dueDate);
    listItem.setAttribute('data-timestamp', timestamp); // Store timestamp
    listItem.classList.add('task-item', 'adding'); // Add 'adding' class for animation
    setTimeout(() => listItem.classList.remove('adding'), 300); // Remove after animation

    if (isCompleted) {
        listItem.classList.add('completed');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const taskDueDate = dueDate ? new Date(dueDate) : null;
    if (taskDueDate) {
        taskDueDate.setHours(0, 0, 0, 0);
    }

    let dueDateHtml = '';
    if (dueDate && !isCompleted) {
        const formattedDate = formatDate(dueDate);
        const isOverdue = taskDueDate && taskDueDate < today;
        dueDateHtml = `<span class="due-date ${isOverdue ? 'overdue' : ''}">Due: ${formattedDate}</span>`;
    }

    listItem.innerHTML = `
        <span class="task-text">${taskText}</span>
        ${dueDateHtml}
        <div>
            <button class="complete-btn" title="Mark as Complete"><i class="fas fa-check"></i></button>
            <button class="delete-btn" title="Delete Task"><i class="fas fa-trash-alt"></i></button>
        </div>
    `;

    const completeBtn = listItem.querySelector('.complete-btn');
    completeBtn.addEventListener('click', () => {
        listItem.classList.toggle('completed');
        const taskSpan = listItem.querySelector('.task-text');
        let existingDueDateSpan = listItem.querySelector('.due-date'); // Use let to reassign
        const currentDueDate = listItem.dataset.dueDate;

        if (listItem.classList.contains('completed')) {
             if (existingDueDateSpan) existingDueDateSpan.remove(); // Remove due date if task is completed
        } else {
            // Re-add due date if task is uncompleted and had one
            if (currentDueDate && !existingDueDateSpan) {
                const isOverdue = taskDueDate && taskDueDate < today;
                existingDueDateSpan = document.createElement('span'); // Reassign to new span
                existingDueDateSpan.classList.add('due-date');
                if (isOverdue) existingDueDateSpan.classList.add('overdue');
                existingDueDateSpan.textContent = `Due: ${formatDate(currentDueDate)}`;
                taskSpan.insertAdjacentElement('afterend', existingDueDateSpan); // Insert after task text
            }
        }
        saveTasks();
        applySort(currentSort); // Re-apply sort if completion changes order
    });

    const deleteBtn = listItem.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => {
        showCustomConfirm("Are you sure you want to delete this task?", () => {
            listItem.classList.add('removing');
            listItem.addEventListener('animationend', () => {
                taskList.removeChild(listItem);
                saveTasks();
                applySort(currentSort); // Re-apply sort after deletion
            }, { once: true });
        });
    });

    const taskSpan = listItem.querySelector('.task-text');
    taskSpan.addEventListener('dblclick', () => {
        const currentText = taskSpan.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentText;
        input.classList.add('edit-input');

        listItem.replaceChild(input, taskSpan);
        input.focus();

        const saveEdit = () => {
            const newText = input.value.trim();
            if (newText === "") {
                showCustomConfirm("Task cannot be empty! Delete this task?", () => {
                    listItem.classList.add('removing');
                    listItem.addEventListener('animationend', () => {
                        taskList.removeChild(listItem);
                        saveTasks();
                        applySort(currentSort);
                    }, { once: true });
                }, () => {
                    taskSpan.textContent = currentText;
                    listItem.replaceChild(taskSpan, input);
                    saveTasks();
                });
            } else {
                taskSpan.textContent = newText;
                listItem.replaceChild(taskSpan, input);
                saveTasks();
                applySort(currentSort); // Re-apply sort after edit
            }
        };

        input.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                saveEdit();
            }
        });

        input.addEventListener('blur', saveEdit);
    });

    // Drag and Drop Events
    listItem.addEventListener('dragstart', handleDragStart);
    listItem.addEventListener('dragover', handleDragOver);
    listItem.addEventListener('dragleave', handleDragLeave);
    listItem.addEventListener('drop', handleDrop);
    listItem.addEventListener('dragend', handleDragEnd);

    return listItem;
}

// Function to add a new task
function addTask() {
    const taskText = taskInput.value.trim();
    const dueDate = dueDateInput.value;

    if (taskText !== "") {
        const newTask = createTaskElement(taskText, undefined, false, dueDate, Date.now()); // Pass current timestamp
        taskList.appendChild(newTask);
        taskInput.value = "";
        dueDateInput.value = "";
        saveTasks();
        applySort(currentSort); // Re-apply sort after adding
        applyFilter(currentFilter);
    } else {
        taskInput.classList.add('shake');
        taskInput.placeholder = "Task cannot be empty!";
        setTimeout(() => {
            taskInput.classList.remove('shake');
            taskInput.placeholder = "Add a new task...";
        }, 800);
    }
}

// Filters tasks based on the current filter setting
function applyFilter(filterType) {
    currentFilter = filterType;

    document.querySelectorAll('.filter-buttons button').forEach(button => {
        button.classList.remove('active');
    });
    document.getElementById(`filter${filterType.charAt(0).toUpperCase() + filterType.slice(1)}`).classList.add('active');


    taskList.querySelectorAll('li').forEach(listItem => {
        const isCompleted = listItem.classList.contains('completed');

        // Temporarily show all items before filtering to ensure correct order after sort
        // This is important because sorting operates on all elements, visible or hidden.
        listItem.style.display = 'flex'; // Ensure it's visible for sorting logic

        switch (filterType) {
            case 'all':
                // Already 'flex'
                break;
            case 'active':
                listItem.style.display = isCompleted ? 'none' : 'flex';
                break;
            case 'completed':
                listItem.style.display = isCompleted ? 'flex' : 'none';
                break;
        }
    });
}

// Clears all completed tasks from the list
function clearCompletedTasks() {
    const completedTasks = taskList.querySelectorAll('li.completed');
    if (completedTasks.length === 0) {
        // Updated to use the custom modal for "no tasks to clear" message
        showCustomConfirm("No completed tasks to clear!", () => {}, () => {}, "Got it!");
        return;
    }
    showCustomConfirm(`Are you sure you want to clear ${completedTasks.length} completed tasks?`, () => {
        Array.from(completedTasks).forEach(task => {
            task.classList.add('removing');
            task.addEventListener('animationend', () => {
                taskList.removeChild(task);
                saveTasks();
                applySort(currentSort);
            }, { once: true });
        });
    });
}

// --- Sorting Logic ---
function applySort(sortType) {
    currentSort = sortType;
    const tasks = Array.from(taskList.children); // Get all task elements as an array

    tasks.sort((a, b) => {
        const aCompleted = a.classList.contains('completed');
        const bCompleted = b.classList.contains('completed');

        // Always put completed tasks at the bottom, regardless of other sort criteria
        if (aCompleted && !bCompleted) return 1;
        if (!aCompleted && bCompleted) return -1;
        // If both are completed or both are active, apply secondary sort
        // This ensures completed tasks are sorted amongst themselves if needed
        // and active tasks are sorted amongst themselves.

        if (sortType === 'due-date-asc' || sortType === 'due-date-desc') {
            const aDueDate = a.dataset.dueDate ? new Date(a.dataset.dueDate) : null;
            const bDueDate = b.dataset.dueDate ? new Date(b.dataset.dueDate) : null;

            // Handle tasks without due dates:
            // For ascending (soonest first), null dates go to the end (treated as very far future)
            // For descending (latest first), null dates go to the beginning (treated as very far past)
            if (aDueDate === null && bDueDate !== null) return sortType === 'due-date-asc' ? 1 : -1;
            if (aDueDate !== null && bDueDate === null) return sortType === 'due-date-asc' ? -1 : 1;
            if (aDueDate === null && bDueDate === null) {
                // If both null, fall back to creation timestamp (newest first for better UX)
                const aTimestamp = parseInt(a.dataset.timestamp);
                const bTimestamp = parseInt(b.dataset.timestamp);
                return bTimestamp - aTimestamp; // Default to newest if no due date
            }

            // Compare actual due dates
            if (sortType === 'due-date-asc') {
                return aDueDate.getTime() - bDueDate.getTime();
            } else { // due-date-desc
                return bDueDate.getTime() - aDueDate.getTime();
            }
        } else if (sortType === 'added-asc' || sortType === 'added-desc') {
            const aTimestamp = parseInt(a.dataset.timestamp);
            const bTimestamp = parseInt(b.dataset.timestamp);

            if (sortType === 'added-asc') {
                return aTimestamp - bTimestamp;
            } else { // added-desc
                return bTimestamp - aTimestamp;
            }
        }
        return 0; // Should not be reached if sortType is valid
    });

    // Re-append tasks in the new sorted order
    tasks.forEach(task => taskList.appendChild(task));
    applyFilter(currentFilter); // Re-apply filter after sorting
}


// --- Drag and Drop Logic ---
let draggedItem = null;

function handleDragStart(e) {
    draggedItem = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    this.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const target = e.target.closest('.task-item');
    if (target && target !== draggedItem && !target.classList.contains('dragging')) {
        const boundingBox = target.getBoundingClientRect();
        const offset = boundingBox.y + (boundingBox.height / 2);

        if (e.clientY < offset) {
            target.style.borderTop = '2px solid #3498db';
            target.style.borderBottom = 'none';
        } else {
            target.style.borderBottom = '2px solid #3498db';
            target.style.borderTop = 'none';
        }
    }
}

function handleDragLeave(e) {
    this.style.borderTop = 'none';
    this.style.borderBottom = 'none';
}

function handleDrop(e) {
    e.preventDefault();
    this.style.borderTop = 'none';
    this.style.borderBottom = 'none';

    if (draggedItem && draggedItem !== this) {
        // This makes sure we don't try to insert after the last element if dragging to the end
        const referenceNode = e.clientY < this.getBoundingClientRect().y + (this.offsetHeight / 2) ? this : this.nextSibling;

        taskList.insertBefore(draggedItem, referenceNode);
        saveTasks(); // Save the new order from drag/drop
        // When using drag-and-drop, it typically overrides the current sort order
        // so we don't call applySort here.
    }
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    draggedItem = null;
    taskList.querySelectorAll('.task-item').forEach(item => {
        item.style.borderTop = 'none';
        item.style.borderBottom = 'none';
    });
    // After drag ends, the new order is saved. If you want the list to re-sort
    // to the selected criteria after a drag, you'd call applySort(currentSort) here.
    // For now, it respects the manual drag until another sort option is chosen.
}


// --- Theme Toggle Logic ---
function saveTheme(theme) {
    localStorage.setItem(LOCAL_STORAGE_THEME_KEY, theme);
    body.className = theme + '-theme'; // Update body class
}

function loadTheme() {
    const savedTheme = localStorage.getItem(LOCAL_STORAGE_THEME_KEY) || 'light'; // Default to light
    body.className = savedTheme + '-theme';
    // Update toggle button icon based on theme
    if (savedTheme === 'dark') {
        themeToggleBtn.querySelector('i').classList.replace('fa-moon', 'fa-sun');
    } else {
        themeToggleBtn.querySelector('i').classList.replace('fa-sun', 'fa-moon');
    }
}

// --- Custom Confirmation Modal Logic ---
let confirmCallback = null;
let cancelCallback = null; // Callback for when 'No' is clicked or modal is closed without confirmation

// This function now accepts an optional custom 'no' button text
function showCustomConfirm(message, onConfirm, onCancel = () => {}, noButtonText = "No") {
    confirmMessageDiv.textContent = message;
    confirmCallback = onConfirm;
    cancelCallback = onCancel; // Set cancel callback

    // Set 'No' button text
    confirmNoBtn.textContent = noButtonText;
    confirmNoBtn.style.display = 'inline-block'; // Ensure it's visible by default

    // If no cancel callback is provided, hide the 'No' button
    if (onCancel === null || onCancel.toString() === (() => {}).toString()) {
        if (noButtonText === "No") { // Only hide if it's the default "No"
            confirmNoBtn.style.display = 'none';
        }
    }


    customConfirmModal.classList.add('visible');
}

function hideCustomConfirm() {
    customConfirmModal.classList.remove('visible');
    confirmCallback = null;
    cancelCallback = null;
}

confirmYesBtn.addEventListener('click', () => {
    if (confirmCallback) {
        confirmCallback();
    }
    hideCustomConfirm();
});

confirmNoBtn.addEventListener('click', () => {
    if (cancelCallback) { // Trigger cancel callback if it exists
        cancelCallback();
    }
    hideCustomConfirm();
});

// Close modal if clicking outside content (on overlay)
customConfirmModal.addEventListener('click', (event) => {
    if (event.target === customConfirmModal) {
        if (cancelCallback) { // Trigger cancel callback if clicking outside
            cancelCallback();
        }
        hideCustomConfirm();
    }
});


// --- Event Listeners and Initial Load ---

// 1. Load tasks and theme when the page first loads
document.addEventListener('DOMContentLoaded', loadTasks);

// 2. Add task when the "Add Task" button is clicked
addTaskBtn.addEventListener('click', addTask);

// 3. Add task when the "Enter" key is pressed in the input field
taskInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        addTask();
    }
});

// 4. Filter buttons event listeners
filterAllBtn.addEventListener('click', () => applyFilter('all'));
filterActiveBtn.addEventListener('click', () => applyFilter('active'));
filterCompletedBtn.addEventListener('click', () => applyFilter('completed'));

// 5. Clear completed tasks button
clearCompletedBtn.addEventListener('click', clearCompletedTasks);

// 6. Theme Toggle Button
themeToggleBtn.addEventListener('click', () => {
    if (body.classList.contains('light-theme')) {
        saveTheme('dark');
        themeToggleBtn.querySelector('i').classList.replace('fa-moon', 'fa-sun');
    } else {
        saveTheme('light');
        themeToggleBtn.querySelector('i').classList.replace('fa-sun', 'fa-moon');
    }
});

// 7. Sort Dropdown Event Listener
sortTasksSelect.addEventListener('change', (event) => {
    applySort(event.target.value); // Apply sort based on selected option
});

// Set today's date as default for dueDateInput
// This is a UX improvement, optional.
const today = new Date();
const year = today.getFullYear();
const month = (today.getMonth() + 1).toString().padStart(2, '0');
const day = today.getDate().toString().padStart(2, '0');
dueDateInput.value = `${year}-${month}-${day}`;
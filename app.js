// NGO Visit Management Application
class NGOVisitManager {
    constructor() {
        this.currentSection = 'dashboard';
        this.isAdminLoggedIn = false;
        this.init();
    }

    init() {
        this.initializeData();
        this.bindEvents();
        this.updateDashboard();
        this.updateResponsesTable();
        this.loadAdminConfig();
    }

    initializeData() {
        // Initialize with sample data if no data exists
        if (!localStorage.getItem('ngoEventConfig')) {
            const sampleConfig = {
                date: "2025-08-15",
                place: "City Community Center",
                description: "Monthly outreach visit to support local community initiatives and distribute supplies.",
                maxExecutive: 5,
                maxSenior: 10,
                maxJunior: 15
            };
            localStorage.setItem('ngoEventConfig', JSON.stringify(sampleConfig));
        }

        if (!localStorage.getItem('ngoResponses')) {
            const sampleResponses = [
            ];
            localStorage.setItem('ngoResponses', JSON.stringify(sampleResponses));
        }
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.showSection(section);
            });
        });

        // Mobile menu toggle
        const mobileToggle = document.getElementById('mobileMenuToggle');
        const sidebar = document.getElementById('sidebar');
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });

        // Response form submission
        document.getElementById('responseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleResponseSubmission();
        });

        // Admin login
        document.getElementById('adminLoginBtn').addEventListener('click', () => {
            this.handleAdminLogin();
        });

        // Admin logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleAdminLogout();
        });

        // Event config form
        document.getElementById('eventConfigForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEventConfig();
        });

        // Clear all responses
        document.getElementById('clearAllBtn').addEventListener('click', () => {
            this.confirmAction(
                'Clear All Responses',
                'Are you sure you want to delete all responses? This action cannot be undone.',
                () => this.clearAllResponses()
            );
        });

        // Export buttons
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportCSV();
        });

        document.getElementById('exportAllBtn').addEventListener('click', () => {
            this.exportCSV();
        });

        // Search functionality
        document.getElementById('searchResponses').addEventListener('input', (e) => {
            this.filterResponses(e.target.value);
        });

        // Modal events
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.hideModal();
        });
    }

    showSection(section) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Update sections
        document.querySelectorAll('.section').forEach(sec => {
            sec.classList.remove('active');
        });
        document.getElementById(`${section}-section`).classList.add('active');

        this.currentSection = section;

        // Close mobile menu
        document.getElementById('sidebar').classList.remove('active');

        // Refresh data when switching sections
        if (section === 'dashboard') {
            this.updateDashboard();
        } else if (section === 'responses') {
            this.updateResponsesTable();
        }
    }

    handleResponseSubmission() {
        const form = document.getElementById('responseForm');
        const formData = new FormData(form);
        
        const response = {
            name: document.getElementById('memberName').value.trim(),
            regNumber: document.getElementById('regNumber').value.trim(),
            phone: document.getElementById('phoneNumber').value.trim(),
            memberType: document.getElementById('memberType').value
        };

        // Clear previous errors
        this.clearFormErrors();

        // Validate form
        if (!this.validateResponse(response)) {
            return;
        }

        // Check if registration number already exists
        const existingResponses = this.getResponses();
        if (existingResponses.some(r => r.regNumber === response.regNumber)) {
            this.showFieldError('regError', 'This registration number is already registered.');
            return;
        }

        // Check member type limits
        const config = this.getEventConfig();
        const memberCounts = this.getMemberCounts();
        const maxLimit = {
            'Executive': config.maxExecutive,
            'Senior': config.maxSenior,
            'Junior': config.maxJunior
        }[response.memberType];

        if (memberCounts[response.memberType] >= maxLimit) {
            this.showFieldError('typeError', `${response.memberType} member limit (${maxLimit}) has been reached.`);
            return;
        }

        // Add response
        response.id = Date.now();
        response.timestamp = new Date().toISOString();
        
        existingResponses.push(response);
        localStorage.setItem('ngoResponses', JSON.stringify(existingResponses));

        // Show success message and reset form
        this.showMessage('Response submitted successfully!', 'success');
        form.reset();
        this.updateDashboard();
    }

    validateResponse(response) {
        let isValid = true;

        if (!response.name) {
            this.showFieldError('nameError', 'Name is required.');
            isValid = false;
        }

        if (!response.regNumber) {
            this.showFieldError('regError', 'Registration number is required.');
            isValid = false;
        }

        if (!response.phone) {
            this.showFieldError('phoneError', 'Phone number is required.');
            isValid = false;
        } else if (!this.isValidPhone(response.phone)) {
            this.showFieldError('phoneError', 'Please enter a valid phone number.');
            isValid = false;
        }

        if (!response.memberType) {
            this.showFieldError('typeError', 'Member type is required.');
            isValid = false;
        }

        return isValid;
    }

    isValidPhone(phone) {
        const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
        return phoneRegex.test(phone);
    }

    showFieldError(elementId, message) {
        document.getElementById(elementId).textContent = message;
    }

    clearFormErrors() {
        const errorElements = document.querySelectorAll('.error-message');
        errorElements.forEach(el => el.textContent = '');
    }

    showMessage(text, type) {
        const messageEl = document.getElementById('submitMessage');
        messageEl.textContent = text;
        messageEl.className = `message ${type}`;
        messageEl.classList.remove('hidden');
        
        setTimeout(() => {
            messageEl.classList.add('hidden');
        }, 5000);
    }

    handleAdminLogin() {
        const password = document.getElementById('adminPassword').value;
        const errorEl = document.getElementById('adminError');
        
        if (password === 'admin123') {
            this.isAdminLoggedIn = true;
            document.getElementById('adminLogin').classList.add('hidden');
            document.getElementById('adminPanel').classList.remove('hidden');
            errorEl.textContent = '';
        } else {
            errorEl.textContent = 'Incorrect password. Try "admin123"';
        }
    }

    handleAdminLogout() {
        this.isAdminLoggedIn = false;
        document.getElementById('adminLogin').classList.remove('hidden');
        document.getElementById('adminPanel').classList.add('hidden');
        document.getElementById('adminPassword').value = '';
    }

    saveEventConfig() {
        const config = {
            date: document.getElementById('eventDateInput').value,
            place: document.getElementById('visitingPlace').value.trim(),
            description: document.getElementById('eventDescriptionInput').value.trim(),
            maxExecutive: parseInt(document.getElementById('maxExecutive').value) || 5,
            maxSenior: parseInt(document.getElementById('maxSenior').value) || 10,
            maxJunior: parseInt(document.getElementById('maxJunior').value) || 15
        };

        localStorage.setItem('ngoEventConfig', JSON.stringify(config));
        this.updateDashboard();
        this.showMessage('Event configuration saved successfully!', 'success');
    }

    loadAdminConfig() {
        const config = this.getEventConfig();
        document.getElementById('eventDateInput').value = config.date;
        document.getElementById('visitingPlace').value = config.place;
        document.getElementById('eventDescriptionInput').value = config.description;
        document.getElementById('maxExecutive').value = config.maxExecutive;
        document.getElementById('maxSenior').value = config.maxSenior;
        document.getElementById('maxJunior').value = config.maxJunior;
    }

    updateDashboard() {
        const config = this.getEventConfig();
        const memberCounts = this.getMemberCounts();

        // Update event info
        document.getElementById('eventDate').textContent = 
            config.date ? new Date(config.date).toLocaleDateString() : 'Not set';
        document.getElementById('eventPlace').textContent = config.place || 'Not set';
        document.getElementById('eventDescription').textContent = config.description || 'No description';

        // Update statistics
        this.updateMemberStats('exec', memberCounts.Executive, config.maxExecutive);
        this.updateMemberStats('senior', memberCounts.Senior, config.maxSenior);
        this.updateMemberStats('junior', memberCounts.Junior, config.maxJunior);
    }

    updateMemberStats(type, current, max) {
        const percentage = max > 0 ? (current / max) * 100 : 0;
        
        document.getElementById(`${type}Status`).textContent = `${current}/${max}`;
        document.getElementById(`${type}Progress`).style.width = `${percentage}%`;

        // Update status color based on capacity
        const statusEl = document.getElementById(`${type}Status`);
        statusEl.className = 'status ';
        if (current >= max) {
            statusEl.classList.add('status--error');
        } else if (current >= max * 0.8) {
            statusEl.classList.add('status--warning');
        } else {
            statusEl.classList.add('status--success');
        }
    }

    updateResponsesTable() {
        const responses = this.getResponses();
        const tbody = document.getElementById('responsesTableBody');
        const emptyState = document.getElementById('emptyState');

        if (responses.length === 0) {
            tbody.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        tbody.innerHTML = responses.map(response => `
            <tr>
                <td>${this.escapeHtml(response.name)}</td>
                <td>${this.escapeHtml(response.regNumber)}</td>
                <td>${this.escapeHtml(response.phone)}</td>
                <td><span class="status status--info">${response.memberType}</span></td>
                <td>${new Date(response.timestamp).toLocaleDateString()}</td>
                <td>
                    <button class="delete-btn" onclick="app.deleteResponse(${response.id})">
                        Delete
                    </button>
                </td>
            </tr>
        `).join('');
    }

    filterResponses(searchTerm) {
        const responses = this.getResponses();
        const filteredResponses = responses.filter(response => 
            response.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            response.regNumber.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const tbody = document.getElementById('responsesTableBody');
        tbody.innerHTML = filteredResponses.map(response => `
            <tr>
                <td>${this.escapeHtml(response.name)}</td>
                <td>${this.escapeHtml(response.regNumber)}</td>
                <td>${this.escapeHtml(response.phone)}</td>
                <td><span class="status status--info">${response.memberType}</span></td>
                <td>${new Date(response.timestamp).toLocaleDateString()}</td>
                <td>
                    <button class="delete-btn" onclick="app.deleteResponse(${response.id})">
                        Delete
                    </button>
                </td>
            </tr>
        `).join('');
    }

    deleteResponse(id) {
        this.confirmAction(
            'Delete Response',
            'Are you sure you want to delete this response?',
            () => {
                const responses = this.getResponses();
                const filteredResponses = responses.filter(r => r.id !== id);
                localStorage.setItem('ngoResponses', JSON.stringify(filteredResponses));
                this.updateResponsesTable();
                this.updateDashboard();
            }
        );
    }

    clearAllResponses() {
        localStorage.setItem('ngoResponses', '[]');
        this.updateResponsesTable();
        this.updateDashboard();
    }

    exportCSV() {
        const responses = this.getResponses();
        const config = this.getEventConfig();
        
        if (responses.length === 0) {
            alert('No responses to export.');
            return;
        }

        const headers = ['Name', 'Registration Number', 'Phone', 'Member Type', 'Registered On'];
        const csvContent = [
            `NGO Visit Responses - ${config.place} (${config.date})`,
            '',
            headers.join(','),
            ...responses.map(r => [
                `"${r.name}"`,
                `"${r.regNumber}"`,
                `"${r.phone}"`,
                `"${r.memberType}"`,
                `"${new Date(r.timestamp).toLocaleDateString()}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ngo-visit-responses-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    confirmAction(title, message, callback) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmModal').classList.remove('hidden');
        
        const confirmBtn = document.getElementById('confirmBtn');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        newConfirmBtn.addEventListener('click', () => {
            callback();
            this.hideModal();
        });
    }

    hideModal() {
        document.getElementById('confirmModal').classList.add('hidden');
    }

    getEventConfig() {
        const config = localStorage.getItem('ngoEventConfig');
        return config ? JSON.parse(config) : {
            date: '',
            place: '',
            description: '',
            maxExecutive: 5,
            maxSenior: 10,
            maxJunior: 15
        };
    }

    getResponses() {
        const responses = localStorage.getItem('ngoResponses');
        return responses ? JSON.parse(responses) : [];
    }

    getMemberCounts() {
        const responses = this.getResponses();
        return responses.reduce((counts, response) => {
            counts[response.memberType] = (counts[response.memberType] || 0) + 1;
            return counts;
        }, { Executive: 0, Senior: 0, Junior: 0 });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application
const app = new NGOVisitManager();
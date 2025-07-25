// NGO Visit Management Application - API-connected

class NGOVisitManager {
    constructor() {
        this.currentSection = 'dashboard';
        this.isAdminLoggedIn = false;
        this.init();
    }

    async init() {
        await this.initializeData();
        this.bindEvents();
        await this.updateDashboard();
        await this.updateResponsesTable();
        this.loadAdminConfig();
    }

    // --- API Helpers ---
    apiUrl(path) {
        return `http://localhost:5000${path}`;
    }

    async getResponsesAPI() {
        const res = await fetch(this.apiUrl('/api/responses'));
        return await res.json();
    }

    async saveResponseAPI(response) {
        const res = await fetch(this.apiUrl('/api/responses'), {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(response)
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to save response');
        }
        return await res.json();
    }

    async clearAllResponsesAPI() {
        await fetch(this.apiUrl('/api/responses'), { method: 'DELETE' });
    }

    // --- Data Initialization (event config stays local for now) ---
    async initializeData() {
        // Only event config uses localStorage, responses fetched from API
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
    }

    bindEvents() {
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
        document.getElementById('responseForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleResponseSubmission();
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
        document.getElementById('exportBtn').addEventListener('click', async () => {
            await this.exportCSV();
        });

        document.getElementById('exportAllBtn').addEventListener('click', async () => {
            await this.exportCSV();
        });

        // Search functionality
        document.getElementById('searchResponses').addEventListener('input', async (e) => {
            await this.filterResponses(e.target.value);
        });

        // Modal events
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.hideModal();
        });
    }

    showSection(section) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');
        document.querySelectorAll('.section').forEach(sec => {
            sec.classList.remove('active');
        });
        document.getElementById(`${section}-section`).classList.add('active');
        this.currentSection = section;
        document.getElementById('sidebar').classList.remove('active');
        if (section === 'dashboard') {
            this.updateDashboard();
        } else if (section === 'responses') {
            this.updateResponsesTable();
        }
    }

    async handleResponseSubmission() {
        const form = document.getElementById('responseForm');
        const response = {
            name: document.getElementById('memberName').value.trim(),
            regNumber: document.getElementById('regNumber').value.trim(),
            phone: document.getElementById('phoneNumber').value.trim(),
            memberType: document.getElementById('memberType').value
        };
        this.clearFormErrors();
        if (!this.validateResponse(response)) {
            return;
        }
        try {
            // Member type limits
            const config = this.getEventConfig();
            const memberCounts = await this.getMemberCounts();
            const maxLimit = { 'Executive': config.maxExecutive, 'Senior': config.maxSenior, 'Junior': config.maxJunior }[response.memberType];
            if (memberCounts[response.memberType] >= maxLimit) {
                this.showFieldError('typeError', `${response.memberType} member limit (${maxLimit}) has been reached.`);
                return;
            }

            await this.saveResponseAPI(response);
            this.showMessage('Response submitted successfully!', 'success');
            form.reset();
            await this.updateDashboard();
            await this.updateResponsesTable();
        } catch (err) {
            if (err.message && err.message.includes('already exists')) {
                this.showFieldError('regError', 'This registration number is already registered.');
            } else {
                this.showMessage(err.message || 'Error: could not submit.', 'error');
            }
        }
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

    getEventConfig() {
        return JSON.parse(localStorage.getItem('ngoEventConfig') || '{}');
    }

    // --- Fetching and Display ---
    async updateDashboard() {
        const config = this.getEventConfig();
        const memberCounts = await this.getMemberCounts();
        document.getElementById('eventDate').textContent = config.date ? new Date(config.date).toLocaleDateString() : 'Not set';
        document.getElementById('eventPlace').textContent = config.place || 'Not set';
        document.getElementById('eventDescription').textContent = config.description || 'No description';

        this.updateMemberStats('exec', memberCounts.Executive, config.maxExecutive);
        this.updateMemberStats('senior', memberCounts.Senior, config.maxSenior);
        this.updateMemberStats('junior', memberCounts.Junior, config.maxJunior);
    }

    updateMemberStats(type, current, max) {
        const percentage = max > 0 ? (current / max) * 100 : 0;
        document.getElementById(`${type}Status`).textContent = `${current}/${max}`;
        document.getElementById(`${type}Progress`).style.width = `${percentage}%`;
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

    async updateResponsesTable() {
        const responses = await this.getResponses();
        const tbody = document.getElementById('responsesTableBody');
        const emptyState = document.getElementById('emptyState');
        if (responses.length === 0) {
            tbody.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }
        emptyState.classList.add('hidden');
        tbody.innerHTML = responses.map((response, idx) => `
            <tr>
                <td>${response.name}</td>
                <td>${response.regNumber}</td>
                <td>${response.phone}</td>
                <td>${response.memberType}</td>
                <td>${response.timestamp ? new Date(response.timestamp).toLocaleString() : ''}</td>
                <td><!-- Action buttons if needed --></td>
            </tr>
        `).join('');
    }

    async getResponses() {
        return await this.getResponsesAPI();
    }

    async getMemberCounts() {
        const responses = await this.getResponsesAPI();
        return {
            Executive: responses.filter(r => r.memberType === "Executive").length,
            Senior: responses.filter(r => r.memberType === "Senior").length,
            Junior: responses.filter(r => r.memberType === "Junior").length
        };
    }

    async filterResponses(query) {
        const responses = await this.getResponses();
        const term = query.toLowerCase();
        const filtered = responses.filter(r =>
            r.name.toLowerCase().includes(term) ||
            r.regNumber.toLowerCase().includes(term) ||
            r.phone.toLowerCase().includes(term) ||
            r.memberType.toLowerCase().includes(term)
        );
        const tbody = document.getElementById('responsesTableBody');
        tbody.innerHTML = filtered.map((response, idx) => `
            <tr>
                <td>${response.name}</td>
                <td>${response.regNumber}</td>
                <td>${response.phone}</td>
                <td>${response.memberType}</td>
                <td>${response.timestamp ? new Date(response.timestamp).toLocaleString() : ''}</td>
            </tr>
        `).join('');
    }

    async clearAllResponses() {
        await this.clearAllResponsesAPI();
        await this.updateDashboard();
        await this.updateResponsesTable();
        this.showMessage('All responses cleared!', 'success');
    }

    hideModal() {
        document.getElementById('modal').classList.add('hidden');
    }

    confirmAction(title, message, onConfirm) {
        const modal = document.getElementById('modal');
        modal.querySelector('.modal-content h3').textContent = title;
        modal.querySelector('.modal-content p').textContent = message;

        // Remove previous listeners
        const okBtn = modal.querySelector('#okBtn');
        const newOkBtn = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);

        newOkBtn.addEventListener('click', async () => {
            modal.classList.add('hidden');
            await onConfirm();
        });
        modal.classList.remove('hidden');
    }

    async exportCSV() {
        const responses = await this.getResponses();
        if (!responses.length) {
            this.showMessage('No data to export', 'error');
            return;
        }
        const csvRows = [
            ['Name', 'Registration Number', 'Phone', 'Member Type', 'Registered On'],
            ...responses.map(r => [
                `"${r.name}"`, `"${r.regNumber}"`, `"${r.phone}"`, `"${r.memberType}"`, `"${r.timestamp ? new Date(r.timestamp).toLocaleString() : ''}"`
            ])
        ];
        const csvContent = csvRows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'responses.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Instantiate the manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.ngoManager = new NGOVisitManager();
});

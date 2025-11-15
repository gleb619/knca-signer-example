// KNCA Signer Example - Vanilla JS with NCALayer integration

class DocumentManager {
    constructor() {
        this.ncalayerClient = null;
        this.documents = [];
        this.caCertsFromPem = null;
        this.init();
    }

    init() {
        this.log(`Запуск...`);
        this.bindEvents();
        this.loadDocuments();
        this.initNCALayer();
        this.log(`Приложение готово к работе`);
    }

    bindEvents() {
        // Create document modal
        const createBtn = document.getElementById('createBtn');
        const modal = document.getElementById('createModal');
        const closeBtn = modal.querySelector('.close');
        const cancelBtn = document.getElementById('cancelBtn');
        const saveBtn = document.getElementById('saveBtn');

        createBtn.addEventListener('click', () => this.showCreateModal());
        closeBtn.addEventListener('click', () => this.hideCreateModal());
        cancelBtn.addEventListener('click', () => this.hideCreateModal());
        saveBtn.addEventListener('click', () => this.createDocument());

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideCreateModal();
            }
        });

        // CA PEM and logging
        const loadCaBtn = document.getElementById('loadCaBtn');
        const clearLogBtn = document.getElementById('clearLogBtn');
        const caFileInput = document.getElementById('caFileInput');

        loadCaBtn.addEventListener('click', () => this.openCAFileDialog());
        caFileInput.addEventListener('change', (event) => this.handleCAFileSelection(event));
        clearLogBtn.addEventListener('click', () => this.clearLog());
    }

    async initNCALayer() {
        try {
            this.log('Подключение к NCALayer...');
            this.ncalayerClient = new NCALayerClient();
            await this.ncalayerClient.connect();
            this.log('NCALayer успешно подключен');
            console.log('NCALayer connected successfully');
        } catch (error) {
            this.log(`Ошибка подключения к NCALayer: ${error.message}`);
            console.error('Failed to connect to NCALayer:', error);
            this.showError('Не удалось подключиться к NCALayer. Убедитесь, что NCALayer установлен и запущен.');
        }
    }

    async loadDocuments() {
        try {
            this.log('Загрузка списка документов с сервера...');
            const response = await fetch('/api/documents');
            if (!response.ok) throw new Error('Failed to load documents');

            this.documents = await response.json();
            this.log(`Загружено ${this.documents.length} документов`);
            this.renderDocuments();
        } catch (error) {
            this.log(`Ошибка загрузки документов: ${error.message}`);
            console.error('Error loading documents:', error);
            this.showError('Ошибка загрузки документов');
        }
    }

    renderDocuments() {
        const container = document.getElementById('documents');
        container.innerHTML = '';

        if (this.documents.length === 0) {
            container.innerHTML = '<div class="loading">Нет документов</div>';
            return;
        }

        this.documents.forEach(doc => {
            const card = this.createDocumentCard(doc);
            container.appendChild(card);
        });
    }

    createDocumentCard(doc) {
        const card = document.createElement('div');
        card.className = `document-card ${doc.signed ? 'signed' : ''}`;
        card.id = `doc-${doc.id}`;

        // Get the template
        const template = document.getElementById('document-card-template');
        const templateContent = template.content.cloneNode(true);

        // Convert to string for replacements
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(templateContent);
        let cardHTML = tempDiv.innerHTML;

        // Calculate data
        const statusClass = doc.signed ? 'status-signed' : 'status-unsigned';
        const statusText = doc.signed ? 'Подписан' : 'Не подписан';

        const maxLength = 500;
        const isTruncated = doc.content.length > maxLength;
        const displayContent = isTruncated ? doc.content.substring(0, maxLength) + '...' : doc.content;
        const fullContent = doc.content;
        const lineCount = doc.content.split('\n').length;
        const sizeKB = Math.round((doc.content.length * 2) / 1024 * 100) / 100;

        const createdAt = doc.createdAt ? `<span>Создан: ${new Date(doc.createdAt).toLocaleDateString()}</span>` : '';
        const contentDataAttr = isTruncated ? `data-full-content="${this.escapeHtml(fullContent)}"` : '';
        const contentToggle = isTruncated ? `<div class="content-toggle"><button class="btn btn-secondary btn-sm" onclick="documentManager.toggleContent('${doc.id}')">📄 Показать полностью</button></div>` : '';
        const actions = !doc.signed ?
            `<button class="btn btn-success sign-btn" onclick="documentManager.signDocument('${doc.id}')">✍️ Подписать документ</button>` :
            `<div class="signed-badge">✓ Подписан</div>`;

        // Replace placeholders
        cardHTML = cardHTML
            .replace('{{id}}', doc.id)
            .replace('{{statusClass}}', statusClass)
            .replace('{{statusText}}', statusText)
            .replace('{{lineCount}}', lineCount)
            .replace('{{sizeKB}}', sizeKB)
            .replace('{{createdAt}}', createdAt)
            .replace('{{displayContent}}', this.escapeHtml(displayContent))
            .replace('{{contentDataAttr}}', contentDataAttr)
            .replace('{{contentToggle}}', contentToggle)
            .replace('{{actions}}', actions);

        card.innerHTML = cardHTML;

        return card;
    }

    async signDocument(docId) {
        if (!this.ncalayerClient) {
            this.showError('NCALayer не подключен');
            return;
        }

        const doc = this.documents.find(d => d.id === docId);
        if (!doc) {
            this.showError('Документ не найден');
            return;
        }

        try {
            this.log(`Начало подписания документа ${docId}...`);

            // Convert document content to base64 for signing
            const base64Data = btoa(unescape(encodeURIComponent(doc.content)));
            this.log(`Документ ${docId} преобразован в base64`);

            // Build signer parameters with CA chain if available
            const signerParams = {
                extKeyUsageOids: ['1.3.6.1.5.5.7.3.4'] // For signing use a id_kp_emailProtection
            };

            const caCertsString = this.caCertsFromPem;
            let caCerts;
            if (caCertsString) {
                caCerts = caCertsString.split(',').map(s => s.trim());
                signerParams.chain = caCerts;
                this.log(`Используется CA chain из ${caCerts.length} сертификатов для документа ${docId}`);
            } else {
                this.log(`CA chain не загружен, подписание без CA для документа ${docId}`);
            }

            // Sign using NCALayer basics module
            const signature = await this.ncalayerClient.basicsSignCMS(
                NCALayerClient.basicsStorageAll, // Use all available storage types
                base64Data, // Document data as base64
                NCALayerClient.basicsCMSParamsDetached, // Detached signature
                signerParams // Custom signer parameters with optional chain
            );

            this.log(`Подпись получена от NCALayer для документа ${docId}`);

            // Send signature to backend
            const response = await fetch(`/api/documents/${docId}/sign`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ signature })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save signature');
            }

            this.log(`Подпись для документа ${docId} успешно сохранена на сервере`);
            this.showSuccess('Документ успешно подписан!');
            await this.loadDocuments(); // Refresh the list

        } catch (error) {
            if (error.canceledByUser) {
                this.log(`Подписание документа ${docId} отменено пользователем`);
                this.showError('Подписание отменено пользователем');
            } else {
                this.log(`Ошибка подписания документа ${docId}: ${error.message}`);
                console.error('Signing error:', error);
                this.showError('Ошибка подписания: ' + error.message);
            }
        }
    }

    showCreateModal() {
        document.getElementById('createModal').style.display = 'block';
        document.getElementById('documentContent').focus();
    }

    hideCreateModal() {
        document.getElementById('createModal').style.display = 'none';
        document.getElementById('documentContent').value = '';
    }

    async createDocument() {
        const content = document.getElementById('documentContent').value.trim();
        if (!content) {
            this.showError('Введите содержимое документа');
            return;
        }

        try {
            this.log('Отправка нового документа на сервер...');
            const response = await fetch('/api/documents', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content })
            });

            if (!response.ok) throw new Error('Failed to create document');

            const newDoc = await response.json();
            this.log(`Документ успешно создан. ID: ${newDoc.id}`);
            this.hideCreateModal();
            this.showSuccess('Документ создан успешно!');
            await this.loadDocuments();

        } catch (error) {
            this.log(`Ошибка создания документа: ${error.message}`);
            console.error('Error creating document:', error);
            this.showError('Ошибка создания документа');
        }
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showMessage(message, type) {
        const div = document.createElement('div');
        div.className = type;
        div.textContent = message;

        const notificationContainer = document.getElementById('notification-container');
        notificationContainer.appendChild(div);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (div.parentNode) {
                div.remove();
            }
        }, 5000);
    }

    // CA PEM File Dialog
    openCAFileDialog() {
        const caFileInput = document.getElementById('caFileInput');
        caFileInput.click();
    }

    // Handle CA file selection
    handleCAFileSelection(event) {
        const file = event.target.files[0];
        if (!file) {
            return; // User cancelled
        }

        this.log(`Выбран файл CA: ${file.name}`);

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            document.getElementById('caPemContent').value = content;
            this.caCertsFromPem = content;
            this.showSuccess(`CA PEM файл "${file.name}" успешно загружен!`);
            this.log('CA PEM файл обработан и готов к использованию');
        };

        reader.onerror = () => {
            this.log('Ошибка при чтении CA файла');
            this.showError('Ошибка при чтении файла CA сертификата');
        };

        reader.readAsText(file);
    }

    // Logging functionality
    log(message, type = 'info') {
        const logOutput = document.getElementById('logOutput');
        const timestamp = new Date().toLocaleTimeString();

        const logMessage = document.createElement('div');
        logMessage.className = 'log-message';

        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'log-timestamp';
        timestampSpan.textContent = `[${timestamp}]`;

        const textSpan = document.createElement('span');
        textSpan.className = 'log-text';
        textSpan.textContent = message;

        logMessage.appendChild(timestampSpan);
        logMessage.appendChild(textSpan);

        logOutput.appendChild(logMessage);
        logOutput.scrollTop = logOutput.scrollHeight;
    }

    clearLog() {
        const logOutput = document.getElementById('logOutput');
        logOutput.innerHTML = '';
    }

    toggleContent(docId) {
        const card = document.getElementById(`doc-${docId}`);
        const contentDiv = card.querySelector('.document-content');
        const toggleBtn = card.querySelector('.content-toggle button');

        const fullContent = contentDiv.dataset.fullContent;
        const isExpanded = contentDiv.classList.contains('expanded');

        if (isExpanded) {
            // Collapse
            const truncated = fullContent.substring(0, 500) + '...';
            contentDiv.innerHTML = this.escapeHtml(truncated);
            contentDiv.classList.remove('expanded');
            toggleBtn.textContent = '📄 Показать полностью';
            toggleBtn.classList.remove('btn-danger');
            toggleBtn.classList.add('btn-secondary');
        } else {
            // Expand
            contentDiv.innerHTML = this.escapeHtml(fullContent);
            contentDiv.classList.add('expanded');
            toggleBtn.textContent = '📄 Свернуть';
            toggleBtn.classList.remove('btn-secondary');
            toggleBtn.classList.add('btn-danger'); // Use danger for collapse
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application
const documentManager = new DocumentManager();

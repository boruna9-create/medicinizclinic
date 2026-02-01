// Medical Document Reviewer - Main Application (Tesseract.js OCR)

let uploadedImages = []; // Support multiple images

// DOM Elements
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const previewSection = document.getElementById('previewSection');
const previewImage = document.getElementById('previewImage');
const analyzeBtn = document.getElementById('analyzeBtn');
const clearBtn = document.getElementById('clearBtn');
const resultsSection = document.getElementById('resultsSection');
const loadingIndicator = document.getElementById('loadingIndicator');
const analysisContent = document.getElementById('analysisContent');

// Upload Area Click
uploadArea.addEventListener('click', () => {
    fileInput.click();
});

// Drag and Drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#764ba2';
    uploadArea.style.background = '#f0f2ff';
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '#667eea';
    uploadArea.style.background = '#f8f9ff';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#667eea';
    uploadArea.style.background = '#f8f9ff';
    
    const files = Array.from(e.dataTransfer.files);
    handleMultipleFiles(files);
});

// File Input Change - NOW SUPPORTS MULTIPLE FILES
fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    handleMultipleFiles(files);
});

// Handle Multiple Files
function handleMultipleFiles(files) {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
        alert('Пожалуйста, загрузите файлы изображений (JPG, PNG)');
        return;
    }

    // DON'T reset - keep accumulating images
    // uploadedImages = []; // REMOVED THIS LINE
    let loadedCount = 0;
    const startIndex = uploadedImages.length; // Track where new images start

    imageFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedImages.push({
                data: e.target.result,
                name: file.name
            });
            loadedCount++;

            // Show preview of first image ever uploaded
            if (uploadedImages.length === 1) {
                previewImage.src = e.target.result;
                previewSection.style.display = 'block';
            }

            // Update upload area text after all new files loaded
            if (loadedCount === imageFiles.length) {
                const uploadText = document.getElementById('uploadText');
                if (uploadText) {
                    uploadText.innerHTML = `✅ Загружено ${uploadedImages.length} изображений<br><small>Нажмите для загрузки еще</small>`;
                }
                resultsSection.style.display = 'none';
                analysisContent.innerHTML = '';
            }
        };
        reader.readAsDataURL(file);
    });
}

// Analyze Document
analyzeBtn.addEventListener('click', async () => {
    if (uploadedImages.length === 0) {
        alert('Пожалуйста, сначала загрузите хотя бы один документ!');
        return;
    }

    resultsSection.style.display = 'block';
    loadingIndicator.style.display = 'block';
    analysisContent.innerHTML = '';

    try {
        const analysis = await analyzeDocuments(uploadedImages);
        displayAnalysis(analysis);
    } catch (error) {
        analysisContent.innerHTML = `
            <div style="color: #d32f2f; padding: 20px; background: #ffebee; border-radius: 10px;">
                <h3>❌ Ошибка</h3>
                <p><strong>Не удалось проанализировать документ:</strong> ${error.message}</p>
                <p style="margin-top: 10px; font-size: 0.9em;">Пожалуйста, попробуйте снова.</p>
            </div>
        `;
    } finally {
        loadingIndicator.style.display = 'none';
    }
});

// Clear All Button
clearBtn.addEventListener('click', () => {
    if (confirm('Вы уверены, что хотите удалить все загруженные документы?')) {
        uploadedImages = [];
        previewSection.style.display = 'none';
        resultsSection.style.display = 'none';
        previewImage.src = '';
        analysisContent.innerHTML = '';
        fileInput.value = '';
        
        const uploadText = document.getElementById('uploadText');
        if (uploadText) {
            uploadText.innerHTML = 'Нажмите для загрузки или перетащите файлы';
        }
    }
});

// Extract Patient Name (NOT doctor name!)
function extractPatientName(text) {
    const lowerText = text.toLowerCase();
    
    // Look for "Пациент:" or "Patient:" followed by name
    const patientPatterns = [
        /пациент[:\s]+([а-яёa-z\s]+)/i,
        /patient[:\s]+([a-z\s]+)/i,
        /ф\.?\s*и\.?\s*о\.?\s*пациента[:\s]+([а-яёa-z\s]+)/i
    ];
    
    for (const pattern of patientPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    
    return null;
}

// Extract Doctor Name
function extractDoctorName(text) {
    const patterns = [
        /доктор[:\s]+([а-яёa-z\s]+)/i,
        /врач[:\s]+([а-яёa-z\s]+)/i,
        /doctor[:\s]+([a-z\s]+)/i,
        /лечащий\s+врач[:\s]+([а-яёa-z\s]+)/i
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    
    return 'Не указано';
}

// Extract Date
function extractDate(text) {
    const datePatterns = [
        /дата[:\s]+(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})/i,
        /(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})/
    ];
    
    for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    
    return 'Не указано';
}

// Check Clinical Guidelines (Клинические Рекомендации)
function checkClinicalGuidelines(text, documentType) {
    const guidelines = [];
    const lowerText = text.toLowerCase();
    
    // Check if document mentions clinical guidelines
    if (lowerText.includes('клинические рекомендации') || lowerText.includes('клинических рекомендаций')) {
        guidelines.push('✅ Документ ссылается на клинические рекомендации');
    } else {
        guidelines.push('⚠️ Нет ссылки на клинические рекомендации');
    }
    
    // Check for standard medical protocols based on document type
    if (documentType.includes('Гинекология')) {
        if (lowerText.includes('узи') || lowerText.includes('ультразвук')) {
            guidelines.push('✅ УЗИ проведено согласно протоколу');
        }
        if (lowerText.includes('анализ') || lowerText.includes('мазок')) {
            guidelines.push('✅ Лабораторные анализы назначены');
        }
    }
    
    return guidelines;
}

// Analyze Documents using Tesseract.js OCR - STEP BY STEP
async function analyzeDocuments(images) {
    let fullAnalysis = '';
    let allDocuments = [];
    
    // STEP 1: Extract text from each document ONE BY ONE
    fullAnalysis += `# 📋 Обработка Документов (Шаг за Шагом)\n\n`;
    
    for (let i = 0; i < images.length; i++) {
        const img = images[i];
        fullAnalysis += `### 📄 Документ ${i + 1} из ${images.length}: ${img.name}\n`;
        fullAnalysis += `⏳ Извлечение текста...\n\n`;
        
        try {
            // Use Tesseract.js to extract text
            const { data: { text } } = await Tesseract.recognize(
                img.data,
                'eng+rus',
                {
                    logger: m => console.log(m)
                }
            );
            
            // Extract key information from THIS document
            const docInfo = {
                number: i + 1,
                name: img.name,
                text: text,
                patient: extractPatientName(text),
                doctor: extractDoctorName(text),
                date: extractDate(text),
                type: detectDocumentType(text)
            };
            
            allDocuments.push(docInfo);
            
            fullAnalysis += `✅ Текст извлечен успешно\n`;
            fullAnalysis += `👤 **Пациент**: ${docInfo.patient || 'Не найдено'}\n`;
            fullAnalysis += `👨‍⚕️ **Врач**: ${docInfo.doctor}\n`;
            fullAnalysis += `📅 **Дата**: ${docInfo.date}\n`;
            fullAnalysis += `📋 **Тип**: ${docInfo.type}\n\n`;
            
        } catch (error) {
            fullAnalysis += `❌ Ошибка обработки документа\n\n`;
        }
    }
    
    fullAnalysis += `---\n\n`;
    
    // STEP 2: Check if all documents belong to same patient
    fullAnalysis += `# 👤 Проверка Пациента\n\n`;
    
    const patientNames = allDocuments
        .map(doc => doc.patient)
        .filter(name => name !== null);
    
    const normalizedNames = patientNames.map(name => name.trim().toLowerCase());
    const uniqueNames = [...new Set(normalizedNames)];
    
    if (uniqueNames.length === 1 && patientNames.length > 0) {
        fullAnalysis += `✅ **Все документы принадлежат одному пациенту**\n\n`;
        fullAnalysis += `**Имя пациента**: ${patientNames[0]}\n`;
        fullAnalysis += `**Количество документов**: ${images.length}\n\n`;
    } else if (uniqueNames.length > 1) {
        fullAnalysis += `⚠️ **ВНИМАНИЕ: Обнаружены документы разных пациентов!**\n\n`;
        const originalUniqueNames = [...new Set(patientNames)];
        originalUniqueNames.forEach(name => {
            fullAnalysis += `- ${name}\n`;
        });
        fullAnalysis += `\n`;
    } else {
        fullAnalysis += `⚠️ **Имя пациента не найдено в документах**\n\n`;
    }
    
    fullAnalysis += `---\n\n`;
    
    // STEP 3: Check Clinical Guidelines
    fullAnalysis += `# 📚 Проверка Клинических Рекомендаций\n\n`;
    
    for (const doc of allDocuments) {
        fullAnalysis += `### Документ ${doc.number}: ${doc.name}\n`;
        const guidelines = checkClinicalGuidelines(doc.text, doc.type);
        guidelines.forEach(guideline => {
            fullAnalysis += `${guideline}\n`;
        });
        fullAnalysis += `\n`;
    }
    
    fullAnalysis += `---\n\n`;
    
    // STEP 4: Comprehensive Analysis for the Patient
    let allExtractedText = allDocuments.map(doc => doc.text).join('\n\n');
    const patientName = patientNames.length > 0 ? patientNames[0] : 'Не указано';
    const combinedAnalysis = analyzeMedicalDocument(allExtractedText, patientName, images.length);
    fullAnalysis += combinedAnalysis;
    
    return fullAnalysis;
}

// Extract patient name from document text
function extractPatientName(text) {
    const lines = text.split('\n');
    
    // Look for patterns like "Пациент: Name" or "Patient: Name"
    for (let line of lines) {
        const lowerLine = line.toLowerCase();
        
        // Russian pattern
        if (lowerLine.includes('пациент:') || lowerLine.includes('пациент :')) {
            const match = line.match(/пациент[:\s]+([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?)/i);
            if (match) return match[1].trim();
        }
        
        // English pattern
        if (lowerLine.includes('patient:') || lowerLine.includes('patient :')) {
            const match = line.match(/patient[:\s]+([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
            if (match) return match[1].trim();
        }
        
        // Name pattern (Cyrillic full name)
        const nameMatch = line.match(/([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+)/);
        if (nameMatch && line.length < 100) { // Likely a name if short line
            return nameMatch[1].trim();
        }
    }
    
    return null;
}

// Get medical recommendations based on document content
function getMedicalRecommendations(text) {
    const recommendations = [];
    
    // Gynecology-related recommendations
    if (text.includes('гинеколог') || text.includes('gynecol') || text.includes('женск') || text.includes('матк') || text.includes('uterus')) {
        recommendations.push('🩺 УЗИ органов малого таза (если не проводилось в последние 6 месяцев)');
        recommendations.push('🦠 Мазок на цитологию (Пап-тест) - ежегодно');
        recommendations.push('🦠 Анализ на гормоны (эстроген, прогестерон)');
    }
    
    // Pregnancy-related
    if (text.includes('беремен') || text.includes('pregnan') || text.includes('плод')) {
        recommendations.push('🤰 Анализ крови на ХГЧ (хорионический гонадотропин)');
        recommendations.push('🩺 УЗИ плода и матки');
        recommendations.push('🦠 Общий анализ крови и мочи');
    }
    
    // Cardiovascular
    if (text.includes('сердц') || text.includes('card') || text.includes('давлен') || text.includes('pressure') || text.includes('гипертон')) {
        recommendations.push('❤️ ЭКГ (электрокардиограмма)');
        recommendations.push('🩺 ЭхоКГ (УЗИ сердца)');
        recommendations.push('🦠 Анализ крови на холестерин и липидный профиль');
    }
    
    // Diabetes
    if (text.includes('диабет') || text.includes('diabet') || text.includes('сахар') || text.includes('glucose') || text.includes('глюкоз')) {
        recommendations.push('🦠 Анализ крови на глюкозу (натощак)');
        recommendations.push('🦠 Гликированный гемоглобин (HbA1c)');
        recommendations.push('🦠 Тест на толерантность к глюкозе');
    }
    
    // Thyroid
    if (text.includes('щитовид') || text.includes('thyroid') || text.includes('гормон')) {
        recommendations.push('🦠 Анализ на гормоны щитовидной железы (TSH, T3, T4)');
        recommendations.push('🩺 УЗИ щитовидной железы');
    }
    
    // Liver
    if (text.includes('печен') || text.includes('liver') || text.includes('гепат')) {
        recommendations.push('🦠 Печеночные пробы (ALT, AST, билирубин)');
        recommendations.push('🩺 УЗИ печени и желчного пузыря');
    }
    
    // Kidneys
    if (text.includes('почк') || text.includes('kidney') || text.includes('renal')) {
        recommendations.push('🦠 Общий анализ мочи');
        recommendations.push('🦠 Анализ крови на креатинин и мочевину');
        recommendations.push('🩺 УЗИ почек');
    }
    
    // Respiratory
    if (text.includes('легк') || text.includes('lung') || text.includes('бронх') || text.includes('кашел')) {
        recommendations.push('📷 Рентген грудной клетки');
        recommendations.push('🦠 Спирометрия (функция внешнего дыхания)');
    }
    
    // Infections
    if (text.includes('инфекц') || text.includes('infection') || text.includes('воспален')) {
        recommendations.push('🦠 Общий анализ крови (лейкоциты, СОЭ)');
        recommendations.push('🦠 Анализ на C-реактивный белок (CRP)');
    }
    
    // Anemia
    if (text.includes('анем') || text.includes('anemia') || text.includes('гемоглобин')) {
        recommendations.push('🦠 Общий анализ крови (гемоглобин, эритроциты)');
        recommendations.push('🦠 Анализ на железо, ферритин');
        recommendations.push('🦠 Витамин B12 и фолиевая кислота');
    }
    
    // General checkup recommendations
    if (recommendations.length === 0) {
        recommendations.push('🦠 Общий анализ крови и мочи');
        recommendations.push('🦠 Биохимический анализ крови');
    }
    
    // Always add follow-up recommendation
    recommendations.push('👨‍⚕️ Повторная консультация с врачом для обсуждения результатов');
    
    return recommendations;
}

// Calculate professional accuracy score
function calculateAccuracyScore(text, requiredFields) {
    const lowerText = text.toLowerCase();
    let score = 0;
    let maxScore = 100;
    
    // Basic completeness (40 points)
    const completenessScore = (requiredFields.filter(f => f.found).length / requiredFields.length) * 40;
    score += completenessScore;
    
    // Professional formatting (20 points)
    let formattingScore = 0;
    if (text.length > 50) formattingScore += 5; // Has substantial content
    if (/\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}/.test(text)) formattingScore += 5; // Has date format
    if (text.split('\n').length > 3) formattingScore += 5; // Multi-line structure
    if (/[A-ZА-Я][a-zа-я]+\s+[A-ZА-Я][a-zа-я]+/.test(text)) formattingScore += 5; // Has proper names
    score += formattingScore;
    
    // Medical terminology (20 points)
    let terminologyScore = 0;
    const medicalTerms = ['диагноз', 'diagnosis', 'лечение', 'treatment', 'анализ', 'test', 'результат', 'result', 
                          'рекомендации', 'recommendation', 'симптом', 'symptom', 'терапия', 'therapy'];
    const foundTerms = medicalTerms.filter(term => lowerText.includes(term)).length;
    terminologyScore = Math.min(20, foundTerms * 3);
    score += terminologyScore;
    
    // Signature/stamps (10 points)
    let authenticationScore = 0;
    if (lowerText.includes('подпись') || lowerText.includes('signature')) authenticationScore += 5;
    if (lowerText.includes('печать') || lowerText.includes('stamp') || lowerText.includes('seal')) authenticationScore += 5;
    score += authenticationScore;
    
    // Contact information (10 points)
    let contactScore = 0;
    if (/\d{3}[\-\s]?\d{3}[\-\s]?\d{4}/.test(text)) contactScore += 5; // Phone number
    if (lowerText.includes('клиника') || lowerText.includes('clinic') || lowerText.includes('hospital')) contactScore += 5;
    score += contactScore;
    
    return Math.round(score);
}

// Get score color and label
function getScoreDetails(score) {
    if (score >= 90) return { color: '#10b981', label: 'Отлично', emoji: '🏆' };
    if (score >= 80) return { color: '#22c55e', label: 'Очень Хорошо', emoji: '✅' };
    if (score >= 70) return { color: '#84cc16', label: 'Хорошо', emoji: '👍' };
    if (score >= 60) return { color: '#eab308', label: 'Удовлетворительно', emoji: '⚠️' };
    if (score >= 50) return { color: '#f59e0b', label: 'Требует Улучшений', emoji: '📝' };
    return { color: '#ef4444', label: 'Неудовлетворительно', emoji: '❌' };
}

// Analyze medical document text
function analyzeMedicalDocument(text, patientName, documentCount) {
    const lowerText = text.toLowerCase();
    let analysis = '';
    
    // Simple, clear header
    analysis += `# 📋 Анализ Документов\n\n`;
    analysis += `Проверяем документы пациента: **${patientName}**\n\n`;
    analysis += `Всего документов: **${documentCount}**\n\n`;
    analysis += `---\n\n`;
    
    // Check for required fields with SIMPLE language
    analysis += `## ✅ Что Есть в Документах:\n\n`;
    
    const requiredFields = [
        { name: '👤 Имя пациента', keywords: ['name', 'patient', 'имя', 'пациент'], found: false },
        { name: '📅 Дата приема', keywords: ['date', 'дата', '202', '201'], found: false },
        { name: '👨‍⚕️ Имя врача', keywords: ['doctor', 'dr.', 'physician', 'врач', 'доктор'], found: false },
        { name: '🏥 Диагноз', keywords: ['diagnosis', 'диагноз', 'condition', 'жалоб'], found: false },
        { name: '✍️ Подпись врача', keywords: ['signature', 'signed', 'подпись'], found: false }
    ];
    
    requiredFields.forEach(field => {
        field.found = field.keywords.some(keyword => lowerText.includes(keyword));
        analysis += `${field.found ? '✅' : '❌'} ${field.name}\n`;
    });
    
    analysis += `\n---\n\n`;
    
    // Calculate accuracy score
    const accuracyScore = calculateAccuracyScore(text, requiredFields);
    const scoreDetails = getScoreDetails(accuracyScore);
    
    analysis += `\n**🎯 Профессиональная Оценка Точности**: <span style="font-size: 2em; font-weight: bold; color: ${scoreDetails.color};">${accuracyScore}/100</span> ${scoreDetails.emoji}\n\n`;
    analysis += `**Статус**: <span style="color: ${scoreDetails.color}; font-weight: bold;">${scoreDetails.label}</span>\n\n`;
    
    // Detailed breakdown
    analysis += `**Детализация Оценки**:\n`;
    const completenessPercent = Math.round((requiredFields.filter(f => f.found).length / requiredFields.length) * 100);
    analysis += `- 📋 Полнота Документа: ${completenessPercent}%\n`;
    analysis += `- 📝 Профессиональное Оформление: ${text.length > 100 ? 'Хорошо' : 'Требует Улучшения'}\n`;
    analysis += `- 🎯 Медицинская Терминология: ${lowerText.includes('диагноз') || lowerText.includes('diagnosis') ? 'Присутствует' : 'Ограничена'}\n`;
    analysis += `- ✒️ Аутентификация: ${lowerText.includes('подпись') || lowerText.includes('signature') ? 'Подпись Обнаружена' : 'Подпись Не Обнаружена'}\n`;
    
    analysis += '\n**📝 Что Отсутствует в Документах Пациента**:\n\n';
    const missingFields = requiredFields.filter(f => !f.found);
    if (missingFields.length > 0) {
        analysis += '**В документах не хватает:**\n\n';
        missingFields.forEach(field => {
            analysis += `- ❌ ${field.name} - попросите врача добавить эту информацию\n`;
        });
        analysis += '\n💡 **Совет**: Обратитесь к врачу, чтобы дополнить документы недостающей информацией.\n';
    } else {
        analysis += '✅ **Отлично!** Все важные поля присутствуют в документах пациента!\n';
    }
    
    // Medical recommendations based on content
    analysis += '\n**🩺 Какие Анализы и Обследования Нужно Сделать Пациенту**:\n\n';
    analysis += '*На основе информации в документах, пациенту рекомендуется:*\n\n';
    
    const medicalRecommendations = getMedicalRecommendations(lowerText);
    if (medicalRecommendations.length > 0) {
        medicalRecommendations.forEach(rec => {
            analysis += `- ${rec}\n`;
        });
    } else {
        analysis += '- На основе доступной информации, рекомендуется консультация с лечащим врачом для определения необходимых обследований\n';
    }
    
    // Medical document standards
    analysis += '\n**Рекомендации по Документу**:\n\n';
    analysis += '- Убедитесь, что вся информация о пациенте читабельна и полна\n';
    analysis += '- Проверьте, что даты указаны в стандартном формате\n';
    analysis += '- Подтвердите, что вся медицинская терминология написана правильно\n';
    analysis += '- Проверьте, что подписи и печати присутствуют там, где требуется\n';
    
    // Professional recommendations based on score - CLEARER FOR PATIENT
    analysis += '\n**💡 Общая Оценка Документов Пациента**:\n\n';
    if (accuracyScore >= 90) {
        analysis += '✅ **Отлично!** Документы пациента очень хорошо оформлены и содержат всю необходимую информацию.\n';
    } else if (accuracyScore >= 80) {
        analysis += '👍 **Очень хорошо!** Документы почти полные. Есть небольшие недостатки (см. выше).\n';
    } else if (accuracyScore >= 70) {
        analysis += '📝 **Хорошо.** Документы содержат основную информацию, но можно улучшить (см. что отсутствует выше).\n';
    } else if (accuracyScore >= 60) {
        analysis += '⚠️ **Удовлетворительно.** В документах не хватает некоторой важной информации. Обратитесь к врачу.\n';
    } else if (accuracyScore >= 50) {
        analysis += '🚧 **Требует улучшений.** Многие важные поля отсутствуют. Попросите врача дополнить документы.\n';
    } else {
        analysis += '❌ **Недостаточно информации.** Документы неполные. Необходимо получить полные медицинские документы от врача.\n';
    }
    
    analysis += '\n---\n';
    return analysis;
}

// Display Analysis Results
function displayAnalysis(analysis) {
    // Convert markdown-style formatting to HTML
    let html = analysis
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h3>$1</h3>')
        .replace(/^# (.+)$/gm, '<h3>$1</h3>')
        .replace(/^\d+\.\s+\*\*(.+?)\*\*:/gm, '<h3>$1:</h3>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(?!<[h|l|p])/gm, '<p>');

    // Wrap consecutive <li> elements in <ul>
    html = html.replace(/(<li>.*?<\/li>\s*)+/gs, '<ul>$&</ul>');

    analysisContent.innerHTML = html;
}

// Add some helpful tips on page load
window.addEventListener('load', () => {
    console.log('Medical Document Reviewer loaded successfully!');
    console.log('Upload medical documents to get AI-powered analysis.');
    console.log('Multiple files supported!');
});

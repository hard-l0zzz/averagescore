// popup.js
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['grades', 'failingGrades'], (data) => {
        const gradesDict = data.grades || {};
        const failingGradesDict = data.failingGrades || {};
        let outputHtml = '';

        for (const [subject, grades] of Object.entries(gradesDict)) {
            const averageGrade = (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2);
            const formattedSubject = subject.charAt(0).toUpperCase() + subject.slice(1);
            outputHtml += `<p>${formattedSubject}: ${averageGrade}</p>`;
        }

        document.getElementById('average').innerHTML = outputHtml || '<p>Нет оценок</p>';

        // Выводим информацию о двойках
        let failingOutputHtml = '';
        for (const [subject, dates] of Object.entries(failingGradesDict)) {
            failingOutputHtml += `<p>${subject.charAt(0).toUpperCase() + subject.slice(1)}: ${dates.join(', ')}</p>`;
        }

        document.getElementById('failing').innerHTML = failingOutputHtml || '<p>Нет двоек</p>';
    });

    const updateButton = document.getElementById('update_button');
    updateButton.addEventListener('click', async () => {
        document.getElementById('update_button').textContent = 'Подождите...';
        
        await getGrades();
        
        chrome.storage.local.get(['grades', 'failingGrades'], (data) => {
            const gradesDict = data.grades || {};
            const failingGradesDict = data.failingGrades || {};
            let outputHtml = '';

            for (const [subject, grades] of Object.entries(gradesDict)) {
                const averageGrade = (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2);
                const formattedSubject = subject.charAt(0).toUpperCase() + subject.slice(1);
                outputHtml += `<p>${formattedSubject}: ${averageGrade}</p>`;
            }

            document.getElementById('average').innerHTML = outputHtml || '<p>Нет оценок</p>';

            // Выводим информацию о двойках
            let failingOutputHtml = '';
            for (const [subject, dates] of Object.entries(failingGradesDict)) {
                failingOutputHtml += `<p>${subject.charAt(0).toUpperCase() + subject.slice(1)}: ${dates.join(', ')}</p>`;
            }

            document.getElementById('failing').innerHTML = failingOutputHtml || '<p>Нет двойок</p>';
        });

        document.getElementById('update_button').textContent = 'Обновить';
    });
});

const gradesMapping = {
    "отлично": 5,
    "хорошо": 4,
    "удовлетворительно": 3,
    "неудовлетворительно": 2
};

async function getGrades() {
    const gradesDict = {};
    const failingGradesDict = {}; // Новый объект для хранения двойок и их дат
    let page = 1;
    let finished = false;

    while (!finished) {
        const response = await fetch(`https://cabinet.ruobr.ru/student/progress/?page=${page}`);
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const rows = doc.querySelectorAll("table.table tbody tr");
        const now = new Date();
        const monthNow = now.getMonth() + 1;

        if (monthNow === 8) {
            console.log("отдыхай не парься!");
            break;
        } else if (monthNow === 9) {
            finished = true;
        } else if (monthNow >= 1 && monthNow <= 7) {
            if (monthNow === 1) {
                finished = true;
            }
        }

        if (rows.length === 0) break;

        rows.forEach(row => {
            const tds = row.querySelectorAll("td");
            if (tds.length < 4) return;

            const dateStr = tds[1].textContent.trim();
            const subjectName = tds[2].textContent.trim().toLowerCase();
            const gradeStr = tds[3].textContent.trim();

            // Проверка даты
            const dateMatch = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/);
            if (dateMatch) {
                const day = parseInt(dateMatch[1]);
                const month = parseInt(dateMatch[2]);
                const year = parseInt(dateMatch[3]);

                if (year < 2024 || (year === 2024 && (month < 9 || (month === 9 && day < 1)))) {
                    finished = true;
                }
            }

            // Добавление оценки в словарь
            const gradeValue = gradesMapping[gradeStr.toLowerCase()];
            if (gradeValue !== undefined) {
                if (!gradesDict[subjectName]) {
                    gradesDict[subjectName] = [];
                }
                gradesDict[subjectName].push(gradeValue);

                // Проверка на двойку
                if (gradeValue === 2) {
                    if (!failingGradesDict[subjectName]) {
                        failingGradesDict[subjectName] = [];
                    }
                    failingGradesDict[subjectName].push(dateStr); // Сохраняем дату двойки
                }
            }
        });

        console.log(`Беру инфу со страницы номер ${page}...`);
        page++;
    }

    console.log("Закончил");

    // Сохраняем оценки и двойки в хранилище
    chrome.storage.local.set({ grades: gradesDict, failingGrades: failingGradesDict });
}

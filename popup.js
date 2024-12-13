// popup.js
document.addEventListener('DOMContentLoaded', () => {


    chrome.storage.local.get('grades', (data) => {
        const gradesDict = data.grades || {};
        let outputHtml = '';

        for (const [subject, grades] of Object.entries(gradesDict)) {
            const averageGrade = (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2);
            const formattedSubject = subject.charAt(0).toUpperCase() + subject.slice(1);
            outputHtml += `<p>${formattedSubject}: ${averageGrade}</p>`;
        }

        document.getElementById('average').innerHTML = outputHtml || '<p>Нет оценок</p>';
    });
    // Находим кнопку "Обновить" по ID и добавляем обработчик события
    const updateButton = document.getElementById('update_button'); // Исправлено на правильный ID

    updateButton.addEventListener('click', async () => {
        document.getElementById('update_button').textContent = 'Подождите...';
    
        // Ждем завершения получения оценок
        await getGrades();
    
        // Получаем оценки из хранилища
        chrome.storage.local.get('grades', (data) => {
            const gradesDict = data.grades || {};
            let outputHtml = '';
    
            for (const [subject, grades] of Object.entries(gradesDict)) {
                const averageGrade = (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2);
                const formattedSubject = subject.charAt(0).toUpperCase() + subject.slice(1);
                outputHtml += `<p>${formattedSubject}: ${averageGrade}</p>`;
            }
    
            document.getElementById('average').innerHTML = outputHtml || '<p>Нет оценок</p>';
        });
    
        // Возвращаем текст кнопки к исходному состоянию
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
    let page = 1;
    let finished = false; // Флаг для отслеживания завершения

    while (!finished) {
        const response = await fetch(`https://cabinet.ruobr.ru/student/progress/?page=${page}`);
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const rows = doc.querySelectorAll("table.table tbody tr");
        const now = new Date();
        const monthNow = now.getMonth() + 1; // Текущий месяц (1-12)
    
        // Проверка текущего месяца
        if (monthNow === 8) {
            console.log("отдыхай не парься!"); // Если август
            break; // Выход из цикла
        } else if (monthNow === 9) {
            finished = true; // Если сентябрь
        } else if (monthNow >= 1 && monthNow <= 7) {
            if (monthNow === 1) {
                finished = true; // Если январь
            }
        }
    
        if (rows.length === 0) break; // Если нет строк, выходим из цикла
    
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
    
                // Установка флага, если дата <= 1 сентября 2024
                if (year < 2024 || (year === 2024 && (month < 9 || (month === 9 && day < 1)))) {
                    finished = true; // Устанавливаем флаг завершения
                }
            }


            // Добавление оценки в словарь
            const gradeValue = gradesMapping[gradeStr.toLowerCase()];
            if (gradeValue !== undefined) {
                if (!gradesDict[subjectName]) {
                    gradesDict[subjectName] = [];
                }
                gradesDict[subjectName].push(gradeValue);
            }
        });

        console.log(`Беру инфу со страницы номер ${page}...`);
        page++;
    }

    // Выводим сообщение о завершении
    console.log("Закончил");

    // Сохраняем оценки в хранилище
    chrome.storage.local.set({ grades: gradesDict });
}


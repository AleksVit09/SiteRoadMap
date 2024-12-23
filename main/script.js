// script.js
// Проверка аутентификации при загрузке страницы
window.onload = function() {
    const loggedInUser = localStorage.getItem('loggedInUser');
    if (!loggedInUser) {
        // Если пользователь не аутентифицирован, перенаправляем на страницу входа
        window.location.href = '../auth/index.html';
    } else {
        // Вы можете использовать loggedInUser для отображения информации о пользователе
        console.log(`Добро пожаловать, ${loggedInUser}!`);
    }
};

    // Функция для выхода из системы
function logout() {
    localStorage.removeItem('loggedInUser');
    alert('Вы успешно вышли из системы.');
    window.location.href = '../auth/index.html';
}
// Инициализация SVG и параметров
const svg = d3.select("#svgCanvas")
    .attr("width", "100%")
    .attr("height", "100%");

// Размеры контейнера
const containerElement = document.querySelector(".graph-container");
const width = containerElement.clientWidth;
const height = containerElement.clientHeight;

// Добавляем контейнер для масштабирования и перемещения
const container = svg.append("g");

// Определение цветов для этапов жизненного цикла
const stageColors = {
    idea: "#FF4500",         // Оранжевый
    development: "#1E90FF",  // Синий
    testing: "#32CD32",      // Зеленый
    launch: "#FFD700",       // Золотой
    growth: "#8A2BE2"        // Фиолетовый
};

// Текущий этап
let currentStage = 'idea';

// Инициализация переменных для текущего этапа
let stagesData = {
    idea: { nodes: [], links: [] },
    development: { nodes: [], links: [] },
    testing: { nodes: [], links: [] },
    launch: { nodes: [], links: [] },
    growth: { nodes: [], links: [] }
};

let nodes = stagesData[currentStage].nodes;
let links = stagesData[currentStage].links;

let nodeIdCounter = 0;
let selectedNode = null;
let selectedLink = null;
let linkCreationNode = null;
let showNames = false;

const linkGroup = container.append("g").attr("class", "links");
const nodeGroup = container.append("g").attr("class", "nodes");
const labelGroup = container.append("g").attr("class", "labels");

// Добавляем группу для подсказки внутри контейнера
const tooltipGroup = container.append("g")
    .attr("class", "tooltip-group")
    .style("display", "none"); // Изначально скрываем подсказку

// Добавляем прямоугольник фона для подсказки
const tooltipRect = tooltipGroup.append("rect")
    .attr("class", "tooltip-rect")
    .attr("fill", "white")
    .attr("stroke", "black")
    .attr("rx", 5)
    .attr("ry", 5);

// Добавляем текстовые элементы для имени и описания
const tooltipTitle = tooltipGroup.append("text")
    .attr("class", "tooltip-title")
    .attr("x", 10)
    .attr("y", 20)
    .attr("font-size", "16px")
    .attr("font-weight", "bold");

const tooltipNameLabel = tooltipGroup.append("text")
    .attr("class", "tooltip-label")
    .attr("x", 10)
    .attr("y", 40)
    .attr("font-size", "14px")
    .text("Имя:");

const tooltipNameInputFO = tooltipGroup.append("foreignObject")
    .attr("x", 60)
    .attr("y", 25)
    .attr("width", 180)
    .attr("height", 30);

const tooltipNameInput = tooltipNameInputFO.append("xhtml:input")
    .attr("type", "text")
    .style("width", "170px")
    .style("height", "20px")
    .style("font-size", "14px")
    .style("resize", "none") // Убираем возможность изменения размера
    .on("mousedown", (event) => event.stopPropagation());

const tooltipDescLabel = tooltipGroup.append("text")
    .attr("class", "tooltip-label")
    .attr("x", 10)
    .attr("y", 70)
    .attr("font-size", "14px")
    .text("Описание:");

const tooltipDescInputFO = tooltipGroup.append("foreignObject")
    .attr("x", 10)
    .attr("y", 75)
    .attr("width", 230)
    .attr("height", 80);

const tooltipDescInput = tooltipDescInputFO.append("xhtml:textarea")
    .style("width", "220px")
    .style("height", "70px")
    .style("font-size", "12px")
    .style("resize", "none") // Убираем возможность изменения размера
    .on("mousedown", (event) => event.stopPropagation());

const saveButtonFO = tooltipGroup.append("foreignObject")
    .attr("x", 10)
    .attr("y", 160)
    .attr("width", 80)
    .attr("height", 30);

const saveButton = saveButtonFO.append("xhtml:button")
    .style("width", "70px")
    .style("height", "25px")
    .style("font-size", "12px")
    .text("Сохранить")
    .on("click", (event) => {
        event.stopPropagation();
        const tooltipData = tooltipGroup.datum();
        const d = tooltipData.data;
        const type = tooltipData.type;

        d.name = tooltipNameInput.property("value");
        d.description = tooltipDescInput.property("value");
        if (type === 'node') {
            d.showName = true; // Показываем имя узла после сохранения
        }
        closeTooltip();
        update();
    });

const editArticleButtonFO = tooltipGroup.append("foreignObject")
    .attr("x", 100)
    .attr("y", 160)
    .attr("width", 140)
    .attr("height", 30);

const editArticleButton = editArticleButtonFO.append("xhtml:button")
    .style("width", "130px")
    .style("height", "25px")
    .style("font-size", "12px")
    .style("overflow", "hidden") // Предотвращаем выход текста за пределы кнопки
    .style("text-overflow", "ellipsis")
    .text("Статья")
    .on("click", (event) => {
        event.stopPropagation();
        const tooltipData = tooltipGroup.datum();
        const d = tooltipData.data;
        openArticleEditor(d);
        closeTooltip();
    });

const closeButton = tooltipGroup.append("text")
    .attr("x", 240)
    .attr("y", 20)
    .attr("font-size", "16px")
    .attr("cursor", "pointer")
    .text("×")
    .on("click", (event) => {
        event.stopPropagation();
        closeTooltip();
    });

// Останавливаем всплытие событий клика внутри tooltipGroup
tooltipGroup.on("mousedown", (event) => event.stopPropagation());

// Добавляем зум и панорамирование
const zoom = d3.zoom()
    .scaleExtent([0.1, 5])
    .on("zoom", function (event) {
        container.attr("transform", event.transform);
    });

svg.call(zoom)
    .on("dblclick.zoom", null);

svg.on("mousedown", (event) => {
    if (event.button !== 0) return;
    svg.style("cursor", "grabbing");
});

svg.on("mouseup", () => {
    svg.style("cursor", "grab");
});

svg.on("dblclick", function(event) {
    if (event.defaultPrevented) return;
    const coords = d3.pointer(event);
    const transform = d3.zoomTransform(svg.node());
    addNodeAtPosition((coords[0] - transform.x) / transform.k, (coords[1] - transform.y) / transform.k);
});

function addNodeAtPosition(x, y) {
    const newNode = {
        id: ++nodeIdCounter,
        x: x,
        y: y,
        name: `Узел ${nodeIdCounter}`,
        description: "",
        article: {
            title: "",
            text: "",
            author: ""
        },
        showName: false,
        color: stageColors[currentStage] // Устанавливаем цвет узла по текущему этапу
    };
    nodes.push(newNode);
    update();
}

function update() {
    // Обновление связей
    const link = linkGroup.selectAll("line")
        .data(links, d => d.id);

    const linkEnter = link.enter()
        .append("line")
        .attr("stroke-width", 8) // Делаем линию толще (8 пикселей)
        .attr("stroke-linecap", "round") // Закругляем концы линии
        .on("click", function(event, d) {
            event.stopPropagation();
            selectLink(d);
        })
        .on("dblclick", function(event, d) {
            event.stopPropagation();
            openTooltip(d, 'link');
        });

    linkEnter.merge(link)
        .attr("stroke", d => {
            if (d === selectedLink) {
                return "orange";
            } else {
                return d.color || "#555"; // Используем цвет связи или дефолтный
            }
        })
        .attr("stroke-width", 8) // Устанавливаем толщину линии
        .attr("stroke-linecap", "round")
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y)
        .attr("stroke", d => d.color || stageColors[currentStage])
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .attr("stroke-width", 8)
        .attr("fill", "none")
        .attr("stroke-opacity", 1)
        .attr("stroke-dasharray", ""); // Можно добавить стиль линии

    // Добавляем черный контур к линии
    linkEnter.merge(link)
        .attr("stroke", d => d.color || stageColors[currentStage])
        .attr("stroke-width", 8)
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .attr("stroke-opacity", 1)
        .attr("fill", "none");

    // Добавляем обводку (контур)
    linkEnter.merge(link)
        .attr("stroke", d => d.color || stageColors[currentStage])
        .attr("stroke-width", 8)
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .attr("stroke-opacity", 1)
        .attr("fill", "none")
        .attr("stroke", d => d.color || stageColors[currentStage])
        .attr("stroke-width", 8)
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .attr("stroke-opacity", 1)
        .attr("fill", "none")
        .attr("stroke", d => d.color || stageColors[currentStage]);

    link.exit().remove();

    // Обновление узлов
    const node = nodeGroup.selectAll("circle")
        .data(nodes, d => d.id);

    const nodeEnter = node.enter()
        .append("circle")
        .attr("r", 70) // Увеличиваем размер узла
        .on("click", function(event, d) {
            event.stopPropagation();
            selectNode(d);
        })
        .on("dblclick", function(event, d) {
            event.stopPropagation();
            openTooltip(d, 'node');
        })
        .on("mousedown", function(event, d) {
            if (event.button === 1) { // Middle mouse button
                event.preventDefault();
                deleteNode(d);
            }
        })
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
        );

    node.merge(nodeEnter)
        .attr("fill", d => {
            if (d === selectedNode) {
                return "orange";
            } else {
                return d.color || "url(#blue-green-gradient)";
            }
        })
        .attr("stroke", "black") // Добавляем черный контур
        .attr("stroke-width", 2)
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", 70); // Увеличиваем размер узла

    node.exit().remove();

    // Обновление названий узлов
    const labels = labelGroup.selectAll("text")
        .data(nodes.filter(d => d.showName || showNames), d => d.id);

    const labelsEnter = labels.enter()
        .append("text")
        .attr("class", "node-name")
        .attr("dy", 5)
        .text(d => d.name);

    labels.merge(labelsEnter)
        .attr("x", d => d.x)
        .attr("y", d => d.y - 80) // Смещаем вверх на больший размер из-за увеличения узла
        .text(d => d.name);

    labels.exit().remove();

    // Обновление позиции подсказки, если она открыта
    if (tooltipGroup.style("display") === "block") {
        const tooltipData = tooltipGroup.datum();
        if (tooltipData) {
            openTooltip(tooltipData.data, tooltipData.type);
        }
    }
}

function dragstarted(event, d) {
    d3.select(this).raise();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
    d.x = event.x;
    d.y = event.y;
    update();
}

function dragended(event, d) {
    d.fx = null;
    d.fy = null;
}

function selectNode(d) {
    if (linkCreationNode === null) {
        linkCreationNode = d;
    } else if (linkCreationNode.id !== d.id) {
        createLink(linkCreationNode, d);
        linkCreationNode = null;
    } else {
        linkCreationNode = null;
    }
    selectedNode = d;
    selectedLink = null;
    // Окрашиваем узел в цвет текущего этапа
    d.color = stageColors[currentStage];
    update();
}

function selectLink(d) {
    selectedLink = d;
    selectedNode = null;
    linkCreationNode = null;
    // Окрашиваем связь в цвет текущего этапа
    d.color = stageColors[currentStage];
    update();
}

function createLink(source, target) {
    // Проверка на существование связи
    if (links.some(l => (l.source === source && l.target === target) || (l.source === target && l.target === source))) {
        alert("Связь между этими узлами уже существует.");
        return;
    }
    const newLink = {
        id: `link-${source.id}-${target.id}`,
        source: source,
        target: target,
        name: `Связь ${source.id}-${target.id}`,
        description: "",
        article: {
            title: "",
            text: "",
            author: ""
        },
        color: stageColors[currentStage] // Устанавливаем цвет связи по текущему этапу
    };
    links.push(newLink);
    update();
}

function openTooltip(d, type) {
    // Заполняем текстовые элементы подсказки
    tooltipTitle.text(type === 'node' ? 'Узел' : 'Связь');
    tooltipNameInput.property("value", d.name || '');
    tooltipDescInput.property("value", d.description || '');

    // Определяем размеры подсказки
    const tooltipWidth = 250;
    const tooltipHeight = 200;

    // Определяем позицию подсказки рядом с узлом или связью
    let x, y;
    if (type === 'node') {
        x = d.x + 80; // Смещаем на 80px вправо от узла (с учетом увеличенного узла)
        y = d.y - tooltipHeight / 2;
    } else if (type === 'link') {
        x = (d.source.x + d.target.x) / 2 + 10; // Смещаем на 10px вправо от центра связи
        y = (d.source.y + d.target.y) / 2 - tooltipHeight / 2;
    }

    // Сохраняем данные в группе подсказки
    tooltipGroup.datum({ data: d, type: type });

    // Обновляем размеры прямоугольника фона
    tooltipRect
        .attr("width", tooltipWidth)
        .attr("height", tooltipHeight);

    // Обновляем позицию группы подсказки
    tooltipGroup
        .attr("transform", `translate(${x}, ${y})`)
        .style("display", "block");
}

function closeTooltip() {
    tooltipGroup.style("display", "none");
}

function openArticleEditor(d) {
    // Открываем редактор статьи в новом окне
    const editorWindow = window.open("", "_blank", "width=600,height=600");
    editorWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ru">
        <head>
            <meta charset="UTF-8">
            <title>Статья</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                input, textarea { width: 100%; margin-bottom: 10px; }
                button { padding: 10px 15px; }
                .editor { border: 1px solid #ccc; padding: 10px; min-height: 300px; }
            </style>
        </head>
        <body>
            <h1>${d.article.title || "Статья"}</h1>
            <label>Заголовок:</label><br>
            <input type="text" id="title" value="${d.article.title || ''}"><br>
            <label>Автор:</label><br>
            <input type="text" id="author" value="${d.article.author || ''}"><br>
            <label>Текст:</label><br>
            <div id="text" class="editor" contenteditable="true">${d.article.text || ''}</div><br>
            <button id="save">Сохранить</button>
        </body>
        </html>
    `);

    editorWindow.document.getElementById('save').onclick = function() {
        d.article.title = editorWindow.document.getElementById('title').value;
        d.article.author = editorWindow.document.getElementById('author').value;
        d.article.text = editorWindow.document.getElementById('text').innerHTML;
        editorWindow.close();
    };

    // Закрываем редактор при удалении узла или связи
    d.editorWindow = editorWindow;
    editorWindow.onbeforeunload = function() {
        if (d.editorWindow) {
            d.editorWindow = null;
        }
    };
}

function deleteNode(d) {
    // Закрываем открытые подсказки и редакторы
    if (d.editorWindow) {
        d.editorWindow.close();
    }
    closeTooltip();

    // Удаляем узел из массива узлов
    nodes = nodes.filter(n => n.id !== d.id);

    // Удаляем связи, связанные с этим узлом
    links = links.filter(l => l.source.id !== d.id && l.target.id !== d.id);

    // Сбрасываем выбранный узел или связь
    if (selectedNode === d) selectedNode = null;
    if (linkCreationNode === d) linkCreationNode = null;

    update();
}

function deleteLink(d) {
    // Закрываем открытые подсказки и редакторы
    if (d.editorWindow) {
        d.editorWindow.close();
    }
    closeTooltip();

    links = links.filter(l => l.id !== d.id);
    if (selectedLink === d) selectedLink = null;
    update();
}

function toggleNamesDisplay() {
    showNames = !showNames;
    nodes.forEach(n => n.showName = showNames);
    update();
}

// Обработчики бокового меню
document.getElementById("menuToggle").onclick = function() {
    const sideMenu = document.getElementById("sideMenu");
    sideMenu.classList.toggle("open");
};

document.getElementById("saveGraph").onclick = saveGraph;
document.getElementById("loadGraph").onclick = loadGraphFromFile;
document.getElementById("toggleNames").onclick = toggleNamesDisplay;

function saveGraph() {
    // Подготовка данных для сохранения
    const graph = {
        stagesData: stagesData,
        currentStage: currentStage,
        nodeIdCounter: nodeIdCounter
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(graph));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "graph.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function loadGraphFromFile() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    fileInput.addEventListener('change', loadGraph);

    fileInput.click();
    document.body.removeChild(fileInput);
}

function loadGraph(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const graph = JSON.parse(e.target.result);
            stagesData = graph.stagesData || stagesData;
            currentStage = graph.currentStage || 'idea';
            nodeIdCounter = graph.nodeIdCounter || 0;
            // Обновляем ссылки на объекты узлов в связях для всех этапов
            for (let stage in stagesData) {
                let stageNodes = stagesData[stage].nodes;
                let stageLinks = stagesData[stage].links;
                stageLinks.forEach(l => {
                    l.source = stageNodes.find(n => n.id === l.source.id || n.id === l.source);
                    l.target = stageNodes.find(n => n.id === l.target.id || n.id === l.target);
                });
            }
            // Обновляем текущие узлы и связи
            nodes = stagesData[currentStage].nodes;
            links = stagesData[currentStage].links;
            // Обновляем активную кнопку этапа
            document.querySelectorAll('.stage-button').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.stage === currentStage);
            });
            updateStageButtons(); // Обновляем цвета кнопок
            update();
        } catch (error) {
            alert("Ошибка при загрузке файла.");
        }
    };
    reader.readAsText(file);
}

// Обработчик удаления узла или связи по клавише Delete
window.addEventListener('keydown', function(event) {
    if (event.key === 'Delete') {
        if (selectedNode) {
            deleteNode(selectedNode);
            selectedNode = null;
        } else if (selectedLink) {
            deleteLink(selectedLink);
            selectedLink = null;
        }
        update();
    }
});

// Удаление по клику колесика мыши
svg.on("mousedown", function(event) {
    if (event.button === 1) { // Middle mouse button
        event.preventDefault();
        if (selectedNode) {
            deleteNode(selectedNode);
            selectedNode = null;
        } else if (selectedLink) {
            deleteLink(selectedLink);
            selectedLink = null;
        }
        update();
    }
});

// Закрытие всплывающей подсказки при нажатии вне SVG
svg.on("mousedown", (event) => {
    if (event.button !== 0) return;
    closeTooltip();
});

svg.on("click", () => {
    selectedNode = null;
    selectedLink = null;
    linkCreationNode = null;
    update();
});

// Обработчик переключения этапов
document.querySelectorAll('.stage-button').forEach(button => {
    button.addEventListener('click', function() {
        // Сбрасываем активную кнопку
        document.querySelectorAll('.stage-button').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        // Сохраняем текущие узлы и связи в stagesData
        stagesData[currentStage].nodes = nodes;
        stagesData[currentStage].links = links;
        // Обновляем текущий этап
        currentStage = this.dataset.stage;
        // Обновляем узлы и связи для нового этапа
        nodes = stagesData[currentStage].nodes || [];
        links = stagesData[currentStage].links || [];
        // Сбрасываем выбор
        selectedNode = null;
        selectedLink = null;
        linkCreationNode = null;
        closeTooltip();
        // Обновляем цвета кнопок
        updateStageButtons();
        // Обновляем граф
        update();
    });
});

// Функция для обновления цветов кнопок этапов
function updateStageButtons() {
    document.querySelectorAll('.stage-button').forEach(button => {
        const stage = button.dataset.stage;
        const color = stageColors[stage];
        button.style.backgroundColor = color;
        button.style.color = "#fff";
    });
}

// Изначальный вызов обновления
updateStageButtons(); // Устанавливаем цвета кнопок при загрузке
update();

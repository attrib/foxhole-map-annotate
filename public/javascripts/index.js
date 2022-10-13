const width = window.innerWidth;
const height = window.innerHeight - 75;

const zoom = d3.zoom();
const x=-100, y=-150, scale=0.5;

// Create WebSocket connection.
const socket = new WebSocket(websocketUrl);

let dataMarkers = [];

const svg = d3.select("#map")
    .append("svg")
    .attr("viewBox", [0, 0, width, height])
    .call(zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale))
    .call(zoom.on("zoom", (event) => {
        g.attr('transform', event.transform);
    }));

const g = svg.append("g")
    .attr("cursor", "grab")
    .attr('transform', `translate(${x}, ${y})scale(${scale})`);

const Tooltip = d3.select("#additional .tooltip");
const Form = d3.select('#additional .form');
let temporaryMarker = null
Form.select('.cancel').on('click', formHide)
Form.select('.submit').on('click', formSubmit)
document.addEventListener('keydown', (event) => {
    if (event.code === "Escape") {
        formHide()
    }
    if (temporaryMarker !== null && event.code === 'Enter' && event.ctrlKey) {
        formSubmit()
    }
})

const img = g.selectAll("image").data([0]);
    img.enter()
    .append("svg:image")
    .attr("xlink:href", imageUrl)
    .on("contextmenu", function (event) {
        event.preventDefault();
        const pointer = d3.pointer(event);
        tooltipHide();
        tooltipMove(event)
        formMove(event);
        temporaryMarker = {
            text: '',
            position: pointer,
            type: 'warning',
        };
        formShow(event, temporaryMarker)
    });

updateData();

function updateData() {
    const markers = g.selectAll("circle").data(dataMarkers);
    markers.join(
        enter =>
            enter.append("circle")
                .attr('cx', (d) => d.position[0])
                .attr('cy', (d) => d.position[1])
                .attr('r', 20)
                .attr('stroke', 'black')
                .attr('fill', getColor)
                .on("contextmenu", function (event, data) {
                    event.preventDefault();
                    socket.send(JSON.stringify({
                        type: 'delete',
                        data: data
                    }))
                    tooltipHide()
                })
                .on("click", function (event, data) {
                    tooltipHide()
                    formMove(event);
                    temporaryMarker = data;
                    formShow(event, temporaryMarker)
                })
                .on("mouseover", tooltipShow)
                .on("mousemove", tooltipMove)
                .on("mouseleave", tooltipHide),

        update =>
            update
                .attr('cx', (d) => d.position[0])
                .attr('cy', (d) => d.position[1])
                .attr('fill', getColor)
    );
}

function getColor(data) {
    switch (data.type) {
        default:
        case 'info':
            return '#1387ef'

        case 'warning':
            return '#f2fa0a'

        case 'danger':
            return '#e30e2f'
    }
}

function tooltipHide() {
    Tooltip.style("opacity", 0);
}

function tooltipShow(event, data) {
    Tooltip.style("opacity", 1);
    Tooltip.select('.text').text(data.text);
    Tooltip.select('.user').text(data.user);
    Tooltip.select('.time').text(data.updated.toLocaleString());
}

function tooltipMove(event) {
    const pointer = d3.pointer(event, document);
    Tooltip
        .style("left", (pointer[0]+20) + "px")
        .style("top", (pointer[1]) + "px")
}

function formHide(event, data) {
    Form.style("opacity", 0);
    Form.select('textarea[name=text]').property('value', '');
    Form.select('select[name=type]').property('value', 'warning');
    temporaryMarker = null
}

function formShow(event, data) {
    Form.style("opacity", 1);
    setTimeout(function() {
        Form.select('textarea[name=text]').node().focus()
        Form.select('textarea[name=text]').node().select()
    }, 1);
    Form.select('textarea[name=text]').property('value', data.text);
    Form.select('select[name=type]').property('value', data.type);
}

function formMove(event) {
    const pointer = d3.pointer(event, document);
    Form
      .style("left", (pointer[0]+20) + "px")
      .style("top", (pointer[1]) + "px")
}

function formSubmit() {
    temporaryMarker.text = Form.select('textarea[name=text]').property('value')
    temporaryMarker.type = Form.select('select[name=type]').property('value')
    socket.send(JSON.stringify({
        type: temporaryMarker.id ? 'update' : 'add',
        data: temporaryMarker
    }))
    formHide();
}

// Connection opened
socket.addEventListener('open', (event) => {

});

// Listen for messages
socket.addEventListener('message', (event) => {
    console.log('Message from server ', event.data);
    const data = JSON.parse(event.data);
    switch (data.type) {
        case 'markers':
            dataMarkers = data.data.map((element) => {
                element.updated = new Date(element.updated)
                return element
            })
            updateData();
            break;
    }
});
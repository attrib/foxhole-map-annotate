const width = window.innerWidth;
const height = window.innerHeight - 100;

const zoom = d3.zoom();
const x=-100, y=-150, scale=0.5, imageUrl="images/upload/railmap.png";

let dataMarkers = [
    {
        updated: new Date(),
        user: 'attrib',
        text: 'Check decay!',
        position: [2416, 1190],
    }
];

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

const img = g.selectAll("image").data([0]);
    img.enter()
    .append("svg:image")
    .attr("xlink:href", imageUrl)
    .on("contextmenu", function (event) {
        event.preventDefault();
        const pointer = d3.pointer(event);
        const data = {
            user: 'attrib',
            text: 'DADA',
            position: pointer,
            updated: new Date(),
        }
        tooltipMove(event);
        tooltipShow(event, data)
        dataMarkers.push(data)
        updateData();
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
                .attr('fill', '#f2fa0a')
                .on("contextmenu", function (event, data) {
                    event.preventDefault();
                    dataMarkers = dataMarkers.filter((compare) => compare!==data)
                    updateData();
                    tooltipHide()
                })
                .on("click", function (event) {

                })
                .on("mouseover", tooltipShow)
                .on("mousemove", tooltipMove)
                .on("mouseleave", tooltipHide),

        update =>
            update
                .attr('cx', (d) => d.position[0])
                .attr('cy', (d) => d.position[1])
    );
}

function tooltipHide(event, data) {
    Tooltip.style("opacity", 0);
}

function tooltipShow(event, data) {
    Tooltip.style("opacity", 1);
    Tooltip.select('.text').text(data.text);
    Tooltip.select('.user').text(data.user);
    Tooltip.select('.time').text(data.updated.toDateString());
}

function tooltipMove(event, data) {
    const pointer = d3.pointer(event, document);
    Tooltip
        .style("left", (pointer[0]+70) + "px")
        .style("top", (pointer[1]) + "px")
}
let isDrawingConstellation, constellationPlanets, constellationLines;

let width = window.innerWidth;
let height = window.innerHeight;
const scale = 10;
const baseSize = 3;
const sizeScale = 2;
const offset = 100;

let svg, g, selectedPlanet, zoom;
let isConstellationMode = false;
let isViewingPlanetFromConstellation = false;

let filteredData;
const useCSV = true;

const csvFilePath = "PSCompPars.csv";

const csvTestString = `pl_name,hostname,disc_year,disc_facility,pl_radj,pl_radjerr1,pl_radjerr2,pl_radjlim,st_spectype,st_teff,st_tefferr1,st_tefferr2,st_tefflim,st_rad,st_raderr1,st_raderr2,st_radlim,st_logg,st_loggerr1,st_loggerr2,st_logglim,rastr,ra,decstr,dec,sy_dist,sy_disterr1,sy_disterr2
Planet1,Star1,2000,Facility1,1.2,0.1,-0.1,0,G2V,5800,100,-100,0,1.0,0.1,-0.1,0,4.5,0.1,-0.1,0,00h00m00s,0.0,+00d00m00s,0.0,10,1,-1
Planet2,Star2,2005,Facility2,0.8,0.05,-0.05,0,K0V,5200,80,-80,0,0.9,0.05,-0.05,0,4.6,0.05,-0.05,0,12h00m00s,180.0,-45d00m00s,-45.0,20,2,-2
Planet3,Star3,2010,Facility3,1.5,0.2,-0.2,0,F5V,6500,150,-150,0,1.2,0.1,-0.1,0,4.3,0.1,-0.1,0,18h00m00s,270.0,+60d00m00s,60.0,15,1.5,-1.5`;

let tempLine = null;
let startPlanet = null;
let planetGroups;

isDrawingConstellation = false;
constellationPlanets = [];
constellationLines = [];

function loadData() {
  if (useCSV) {
    d3.csv(csvFilePath).then(processData).catch(handleError);
  } else {
    const data = d3.csvParse(csvTestString);
    processData(data);
  }
}

function processData(data) {
  data.forEach((d) => {
    d.ra = +d.ra;
    d.dec = +d.dec;
    d.sy_dist = +d.sy_dist;
    d.pl_radj = +d.pl_radj;
    d.st_teff = +d.st_teff;
  });

  filteredData = data.filter(
    (d) => d.ra && d.dec && d.sy_dist && d.pl_radj && d.st_teff
  );

  if (!svg) {
    initializeSVG();
  }
  planetGroups = updateMap(filteredData, "xy");
}

function handleError(error) {
  console.error("Error loading or parsing data:", error);
}

function initializeSVG() {
  svg = d3
    .select("#map")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  g = svg.append("g");

  zoom = d3.zoom().scaleExtent([0.1, 10]).on("zoom", zoomed);

  svg.call(zoom);

  g.append("circle")
    .attr("cx", width / 2)
    .attr("cy", height / 2)
    .attr("r", 5)
    .attr("fill", "orange")
    .on("click", function () {
      showSidePanel(
        {
          pl_name: "Sun",
          hostname: "Solar System",
          disc_year: "N/A",
          pl_radj: 0.10045,
          st_teff: 5778,
          sy_dist: 0,
        },
        this
      );
    });

  for (let i = 0; i < 3; i++) {
    g.append("circle")
      .attr("class", "sun-ripple")
      .attr("cx", width / 2)
      .attr("cy", height / 2)
      .attr("r", 8)
      .style("animation-delay", `${i * 0.4}s`);
  }
}

initializeSVG();

function zoomed(event) {
  g.attr("transform", event.transform);
}

function calculateCoordinates(planet, plane) {
  const x =
    planet.sy_dist *
    Math.cos((planet.dec * Math.PI) / 180) *
    Math.cos((planet.ra * Math.PI) / 180);
  const y =
    planet.sy_dist *
    Math.cos((planet.dec * Math.PI) / 180) *
    Math.sin((planet.ra * Math.PI) / 180);
  const z = planet.sy_dist * Math.sin((planet.dec * Math.PI) / 180);

  switch (plane) {
    case "xy":
      return { x: x, y: y };
    case "xz":
      return { x: x, y: z };
    case "yz":
      return { x: y, y: z };
  }
}

function getTemperatureColor(temp) {
  if (temp < 3500) return "#0000FF";
  if (temp < 5000) return "#00FFFF";
  if (temp < 6000) return "#FFFFFF";
  if (temp < 7500) return "#FFFF00";
  if (temp < 10000) return "#FFA500";
  return "#FF0000";
}

function updateMap(data, plane) {
  g.selectAll(".planet-group").remove();

  planetGroups = g
    .selectAll(".planet-group")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "planet-group")
    .attr("transform", (d) => {
      const coords = calculateCoordinates(d, plane);
      const x = width / 2 + coords.x * scale + offset;
      const y = height / 2 - coords.y * scale - offset;
      return `translate(${x}, ${y})`;
    });

  planetGroups
    .append("circle")
    .attr("class", "aura")
    .attr("r", (d) => baseSize + (d.pl_radj || 0.1) * sizeScale + 2)
    .attr("fill", (d) => getTemperatureColor(d.st_teff))
    .attr("opacity", 0.3);

  planetGroups
    .append("circle")
    .attr("class", "planet")
    .attr("r", (d) => baseSize + (d.pl_radj || 0.1) * sizeScale);

  planetGroups
    .on("mouseover", function (event, d) {
      if (!isDrawingConstellation || d.pl_name !== "Sun") {
        d3.select(this).select(".aura").attr("opacity", 0.6);
        g.append("text")
          .attr("class", "tooltip")
          .attr(
            "x",
            parseFloat(d3.select(this).attr("transform").split("(")[1]) + 10
          )
          .attr(
            "y",
            parseFloat(d3.select(this).attr("transform").split(",")[1]) - 10
          )
          .text("SHIP " + d.pl_name)
          .attr("fill", "white");
      }
    })
    .on("mouseout", function () {
      d3.select(this).select(".aura").attr("opacity", 0.3);
      g.selectAll(".tooltip").remove();
    })
    .on("click", function (event, d) {
      if (!isDrawingConstellation || d.pl_name !== "Sun") {
        handlePlanetClick(d);
      }
    });

  if (isDrawingConstellation) {
    redrawConstellation(plane);
  } else {
    g.selectAll(".constellation-line").remove();
  }

  return planetGroups;
}

function performSearch() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  console.log("Searching for:", searchTerm);

  const results = filteredData.filter((planet) =>
    planet.pl_name.toLowerCase().includes(searchTerm)
  );
  console.log("Search results:", results);

  const searchResultsContainer = document.getElementById(
    "searchResultsContainer"
  );
  const planetInfoContainer = document.getElementById("planetInfoContainer");
  const searchResults = document.getElementById("searchResults");
  const sidepanel = document.getElementById("sidepanel");

  searchResults.innerHTML = "";
  if (results.length > 0) {
    results.forEach((planet) => {
      const li = document.createElement("li");
      li.textContent = planet.pl_name;
      li.onclick = () => {
        showSidePanel(planet);
        console.log("Clicked on planet:", planet.pl_name);
      };
      searchResults.appendChild(li);
    });

    searchResultsContainer.style.display = "block";
    planetInfoContainer.style.display = "none";
    sidepanel.classList.add("open");
  } else {
    searchResults.innerHTML = "<li>No results found</li>";
    searchResultsContainer.style.display = "block";
    planetInfoContainer.style.display = "none";
    sidepanel.classList.add("open");
  }

  console.log("Search results displayed:", searchResults.children.length);
}

function showSidePanel(planet, element, fromConstellation = false) {
  console.log("Showing side panel for:", planet.pl_name);

  const sidepanel = document.getElementById("sidepanel");
  const searchResultsContainer = document.getElementById(
    "searchResultsContainer"
  );
  const planetInfoContainer = document.getElementById("planetInfoContainer");

  if (!sidepanel) {
    console.error("Side panel element not found");
    return;
  }

  sidepanel.classList.add("open");
  searchResultsContainer.style.display = "none";
  planetInfoContainer.style.display = "block";
  isViewingPlanetFromConstellation = fromConstellation;

  const setElementText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setElementText("planetName", planet.pl_name);
  setElementText("hostStar", planet.hostname);
  setElementText("discoveryYear", planet.disc_year);
  setElementText("planetRadius", `${planet.pl_radj} Jupiter Radius`);
  setElementText("starTemperature", `${planet.st_teff} K`);
  setElementText("planetDistance", `${planet.sy_dist} parsecs`);

  const directionButton = document.getElementById("directionButton");
  if (directionButton) {
    directionButton.style.display = fromConstellation
      ? "none"
      : planet.pl_name === "Sun"
      ? "none"
      : "block";
  }

  selectedPlanet = planet;
}

function adjustMapPosition() {
  const sidepanelWidth = 300;
  const transform = d3.zoomTransform(svg.node());
  const newTransform = d3.zoomIdentity
    .translate(transform.x - sidepanelWidth / 2, transform.y)
    .scale(transform.k);

  svg.transition().duration(300).call(zoom.transform, newTransform);
}

function showDirection() {
  if (
    !selectedPlanet ||
    !document.getElementById("sidepanel").classList.contains("open")
  )
    return;

  g.selectAll(".direction-line").remove();

  const coords = calculateCoordinates(selectedPlanet, getCurrentPlane());
  const x = width / 2 + coords.x * scale + offset;
  const y = height / 2 - coords.y * scale - offset;

  g.append("line")
    .attr("class", "direction-line")
    .attr("x1", width / 2)
    .attr("y1", height / 2)
    .attr("x2", x)
    .attr("y2", y)
    .attr("stroke", "white")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "5,5");
}

function resetConstellationDrawing() {
  startPlanet = null;
  if (tempLine) {
    tempLine.remove();
    tempLine = null;
  }
}

document.getElementById("closePanel").addEventListener("click", function () {
  const sidepanel = document.getElementById("sidepanel");
  sidepanel.classList.remove("open");

  if (isViewingPlanetFromConstellation) {
    setTimeout(() => {
      showConstellationSidebar();
    }, 300);
  } else {
    isConstellationMode = false;
    hideConstellation();
    isDrawingConstellation = false;
    document
      .getElementById("createConstellationButton")
      .classList.remove("active");
  }
});

function hideConstellation() {
  if (!isConstellationMode) {
    g.selectAll(".constellation-line").remove();
  }
  g.selectAll(".direction-line").remove();
}

document
  .getElementById("directionButton")
  .addEventListener("click", showDirection);

document
  .getElementById("planeSelector")
  .addEventListener("click", function (event) {
    if (event.target.tagName === "A") {
      event.preventDefault();
      const plane = event.target.getAttribute("data-plane");
      updateMap(filteredData, plane);

      this.querySelectorAll("a").forEach((a) => a.classList.remove("active"));
      event.target.classList.add("active");

      if (!isDrawingConstellation) {
        g.selectAll(".constellation-line").remove();
      }
    }
  });

document
  .getElementById("searchButton")
  .addEventListener("click", performSearch);
document
  .getElementById("searchInput")
  .addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      performSearch();
    }
  });

window.addEventListener("resize", function () {
  width = window.innerWidth;
  height = window.innerHeight;
  svg.attr("width", width).attr("height", height);
  updateMap(filteredData, "xy");
});

loadData();

function toggleConstellationDrawing() {
  isDrawingConstellation = !isDrawingConstellation;
  isConstellationMode = isDrawingConstellation;
  const button = document.getElementById("createConstellationButton");
  button.classList.toggle("active", isDrawingConstellation);

  if (isDrawingConstellation) {
    showConstellationSidebar();
    redrawConstellation(getCurrentPlane());
  } else {
    hideConstellationSidebar();
    g.selectAll(".constellation-line").remove();
  }
}

document
  .getElementById("createConstellationButton")
  .addEventListener("click", toggleConstellationDrawing);

function showConstellationSidebar() {
  const sidepanel = document.getElementById("sidepanel");
  const searchResultsContainer = document.getElementById(
    "searchResultsContainer"
  );
  const planetInfoContainer = document.getElementById("planetInfoContainer");

  searchResultsContainer.innerHTML =
    "<h3>Constellation Planets</h3><ul id='constellationList'></ul>";
  updateConstellationList();

  searchResultsContainer.style.display = "block";
  planetInfoContainer.style.display = "none";
  sidepanel.classList.add("open");
  isConstellationMode = true;
  isViewingPlanetFromConstellation = false;
}

function hideConstellationSidebar() {
  const sidepanel = document.getElementById("sidepanel");
  sidepanel.classList.remove("open");
  isConstellationMode = false;
  isViewingPlanetFromConstellation = false;
  isDrawingConstellation = false;
  document
    .getElementById("createConstellationButton")
    .classList.remove("active");
  g.selectAll(".constellation-line").remove();
}

function updateConstellationList() {
  const list = document.getElementById("constellationList");
  list.innerHTML = "";
  constellationPlanets.forEach((planet) => {
    const li = document.createElement("li");
    li.textContent = `${planet.pl_name} (${planet.hostname})`;
    li.onclick = () => showSidePanel(planet, null, true);
    list.appendChild(li);
  });
}

function getCurrentPlane() {
  const activePlaneElement = document.querySelector("#planeSelector a.active");
  return activePlaneElement
    ? activePlaneElement.getAttribute("data-plane")
    : "xy";
}

function handlePlanetClick(planet) {
  if (isDrawingConstellation) {
    if (planet.pl_name === "Sun") return;

    if (!startPlanet) {
      startPlanet = planet;
      addPlanetToConstellation(planet);
    } else {
      drawConstellationLine(startPlanet, planet, getCurrentPlane());
      addPlanetToConstellation(planet);
      startPlanet = null;
    }
  } else {
    showSidePanel(planet);
  }
}

function addPlanetToConstellation(planet) {
  if (!constellationPlanets.some((p) => p.pl_name === planet.pl_name)) {
    constellationPlanets.push(planet);
    updateConstellationList();
  }
}

function drawConstellationLine(planet1, planet2, plane) {
  const coords1 = calculateCoordinates(planet1, plane);
  const coords2 = calculateCoordinates(planet2, plane);
  const x1 = width / 2 + coords1.x * scale + offset;
  const y1 = height / 2 - coords1.y * scale - offset;
  const x2 = width / 2 + coords2.x * scale + offset;
  const y2 = height / 2 - coords2.y * scale - offset;

  const line = g
    .append("line")
    .attr("class", "constellation-line")
    .attr("x1", x1)
    .attr("y1", y1)
    .attr("x2", x2)
    .attr("y2", y2);

  constellationLines.push(line);
}

function redrawConstellation(plane) {
  g.selectAll(".constellation-line").remove();

  if (isDrawingConstellation) {
    for (let i = 0; i < constellationPlanets.length - 1; i += 2) {
      drawConstellationLine(
        constellationPlanets[i],
        constellationPlanets[i + 1],
        plane
      );
    }

    if (startPlanet) {
      const coords = calculateCoordinates(startPlanet, plane);
      const x1 = width / 2 + coords.x * scale + offset;
      const y1 = height / 2 - coords.y * scale - offset;

      tempLine = g
        .append("line")
        .attr("class", "temp-constellation-line constellation-line")
        .attr("x1", x1)
        .attr("y1", y1)
        .attr("x2", x1)
        .attr("y2", y1);
    }
  }
}

document.getElementById("closePanel").addEventListener("click", function () {
  const sidepanel = document.getElementById("sidepanel");
  sidepanel.classList.remove("open");

  if (isDrawingConstellation) {
    hideConstellationSidebar();
  } else {
    hideConstellation();
  }
});

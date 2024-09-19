import { createApp, reactive } from "vue";

import Stats from "./Components/Stats.vue";
import VPCounterStats from "./Components/VPCounterStats.vue";
import Socket from "./webSocket.js";


const data = reactive({
  version: null,
  warStatus: '',
  requiredVictoryTowns: 32,
  conquerStatus: {},
  warFeatures: {}
})

const queue = reactive({queues: {}})

const socket = new Socket('/stats')
socket.on('init', (initData) => {
  if (data.version === null) {
    data.version = initData.version
  } else if (data.version !== initData.version) {
    window.location.reload()
  }
  data.requiredVictoryTowns = initData.requiredVictoryTowns
  data.warStatus = initData.warStatus
  data.conquerStatus = initData.conquerStatus
  data.warFeatures = initData.warFeatures
  queue.queues = initData.queueStatus.queues
});

socket.on('conquer', (conquerData) => {
  if (data.conquerStatus.version === conquerData.version) {
    return
  }
  if (!conquerData.full && conquerData.oldVersion !== data.conquerStatus.version) {
    socket.send('getConquerStatus', true)
    return
  }
  data.conquerStatus.version = conquerData.version
  data.conquerStatus.features = conquerData.full ? conquerData.features : {...data.conquerStatus.features, ...conquerData.features}
  data.conquerStatus.warNumber = conquerData.warNumber
});

socket.on('queue', (queues) => {
  queue.queues = queues.queues
})

createApp(Stats, {
  data: data,
  queueStatus: queue,
}).mount('#map')

createApp(VPCounterStats, {
  data: data,
}).mount('#war-score')

/**
 * An experimental browser feature that allows a page to be displayed in Picture-in-Picture mode.
 * Only for Edge and Chrome right now.
 *
 * @returns {void}
 */
function loadPipModeFeature() {
  const mainElement = document.querySelector("main");
  const pipButton = document.querySelector("#pip-button");

  if (!(mainElement instanceof HTMLElement)) {
    console.warn("Main element not found on page initialization.");
    return;
  }

  if (!(pipButton instanceof HTMLButtonElement)) {
    console.warn("Picture-in-Picture button not found on page initialization.");
    return;
  }

  if (!("documentPictureInPicture" in window)) {
    console.info("Picture-in-Picture mode is not supported in this browser.");
    pipButton.remove();
    return;
  }

  const documentPictureInPicture = /** @type {{ requestWindow: () => Promise<Window> }} */ (window.documentPictureInPicture);

  pipButton.addEventListener("click", () => {
    documentPictureInPicture.requestWindow().then((pipWindow) => {
      for (const stylesheet of document.styleSheets) {
        const cssRules = [...stylesheet.cssRules].map((rule) => rule.cssText).join("");
        const style = document.createElement("style");

        style.textContent = cssRules;
        pipWindow.document.head.appendChild(style);
      }

      pipWindow.document.body.append(mainElement);

      pipWindow.addEventListener("pagehide", () => {
        document.body.append(mainElement);
      });
    });
  });

  pipButton.setAttribute("data-supported", "true");
}

loadPipModeFeature();
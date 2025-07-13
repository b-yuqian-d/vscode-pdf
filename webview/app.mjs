import {PDFViewerApplication, PDFViewerApplicationConstants, PDFViewerApplicationOptions} from "./lib/web/viewer.mjs";

async function loadDocument() {
  function loadConfig() {
    const configMetaElement = document.querySelector('meta[name="pdfViewerConfig"]');
    if (configMetaElement) {
      const configData = configMetaElement.getAttribute('content');
      const binaryString = window.atob(configData);
      const byteArray = Uint8Array.from(binaryString, item => item.codePointAt(0));
      const jsonString = new TextDecoder().decode(byteArray);
      return JSON.parse(jsonString);
    }
    throw new Error('Could not load configuration.')
  }

  function cursorTool(name) {
    if (name === 'hand') {
      return 1
    }
    return 0
  }

  function scrollMode(name) {
    switch (name) {
      case 'vertical':
        return PDFViewerApplicationConstants.ScrollMode.VERTICAL
      case 'horizontal':
        return PDFViewerApplicationConstants.ScrollMode.HORIZONTAL
      case 'wrapped':
        return PDFViewerApplicationConstants.ScrollMode.WRAPPED
      case 'page':
        return PDFViewerApplicationConstants.ScrollMode.PAGE
      default:
        return PDFViewerApplicationConstants.ScrollMode.UNKNOWN
    }
  }

  function spreadMode(name) {
    switch (name) {
      case 'none':
        return PDFViewerApplicationConstants.SpreadMode.NONE
      case 'odd':
        return PDFViewerApplicationConstants.SpreadMode.ODD
      case 'even':
        return PDFViewerApplicationConstants.SpreadMode.EVEN
      default:
        return PDFViewerApplicationConstants.SpreadMode.UNKNOWN
    }
  }

  async function generateWorkerBlobUri(workerUri) {
    const response = await fetch(workerUri);
    if (!response.ok) {
      console.error("Can not fetch worker script")
      return workerUri;
    }
    const workerScript = await response.blob();
    return URL.createObjectURL(workerScript);
  }

  function getAbsoluteUrl(relativePath) {
    return URL.parse(relativePath, document.baseURI).href;
  }

  await PDFViewerApplication.initializedPromise
  const config = loadConfig()
  const onDocumentLoaded = () => {
    PDFViewerApplication.pdfCursorTools.switchTool(cursorTool(config.cursor))
    PDFViewerApplication.pdfViewer.currentScaleValue = config.scale
    PDFViewerApplication.pdfViewer.scrollMode = scrollMode(config.scrollMode)
    PDFViewerApplication.pdfViewer.spreadMode = spreadMode(config.spreadMode)
    if (config.sidebar) {
      PDFViewerApplication.pdfSidebar.open()
    } else {
      PDFViewerApplication.pdfSidebar.close()
    }
  }
  PDFViewerApplication.eventBus.on('documentloaded', onDocumentLoaded, {once: true})

  PDFViewerApplication.appConfig.toolbar.download.classList.toggle('hidden')
  PDFViewerApplication.appConfig.secondaryToolbar.downloadButton.classList.toggle('hidden')
  PDFViewerApplication.appConfig.secondaryToolbar.openFileButton.classList.toggle('hidden')

  const workerUrl = getAbsoluteUrl('../build/pdf.worker.mjs')
  PDFViewerApplicationOptions.set('workerSrc', await generateWorkerBlobUri(workerUrl))
  const args = {
    url: config.documentUrl,
    cMapUrl: getAbsoluteUrl('./cmaps/'),
    iccUrl: getAbsoluteUrl('./iccs/'),
    standardFontDataUrl: getAbsoluteUrl('./standard_fonts/'),
    wasmUrl: getAbsoluteUrl('./wasm/'),
  }
  await PDFViewerApplication.open(args)

  window.addEventListener('message', async function (event) {
    const message = event.data
    if (message.type === 'reload') {
      await PDFViewerApplication.open(args)
    }
  });

  window.onerror = function () {
    const message = document.createElement('body')
    message.innerText = 'An error occurred while loading the PDF file. Please open it again.'
    document.body = message
  }
}

await loadDocument();

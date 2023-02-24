let tabId;

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementsByTagName('body')[0].style.backgroundPosition = '0% 0';

    let tab = (await browser.tabs.query({ active: true, currentWindow: true }))[0];
    let url = tab.url;
    tabId = tab.id;
    if (/^https?:\/\/cts.strath.ac.uk\/Scientia\/live2223sws\/showtimetable.aspx/.test(url)) {
        document.getElementById("popup-content-wrong-page").style.display = "none";
        document.getElementById("export-ics").addEventListener("click", beginExportICS);
    } else {
        document.getElementById("popup-content").style.display = "none";
    }
});

document.addEventListener('pagehide', () => {
    document.getElementsByTagName('body')[0].style.backgroundPosition = '100% 0';
});

async function beginExportICS() {
    await browser.tabs.sendMessage(tabId, { command: "exportICS" });
    console.log("Sent message to content script");
}
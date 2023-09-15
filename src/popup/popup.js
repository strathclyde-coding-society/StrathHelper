import autoComplete from "@tarekraafat/autocomplete.js";
import browser, { permissions } from "webextension-polyfill";

let tabId;
let yearAutoComplete;
let semesterAutoComplete;
let courseCode;
let semester;
let html;

async function grantPermission() {
    console.log("grant permission");
    let permission_url = "https://cts.strath.ac.uk/Scientia/live2324sws/default.aspx";
    let perm = {
        origins: [permission_url],
        permissions: ["webRequest"]
    };
    if (await browser.permissions.request(perm)) {
        document.querySelector('body').innerHTML = html;
        contentLoaded();
    }
}

async function contentLoaded() {
    let permission_url = "https://cts.strath.ac.uk/Scientia/live2324sws/default.aspx";
    let perm = {
        origins: [permission_url],
        permissions: ["webRequest"]
    };

    if (!await browser.permissions.contains(perm)) {
        html = document.querySelector('body').innerHTML;
        document.querySelector('body').innerHTML = `
                <div>
                    <h2>Access to the Strathclyde timetable service is required.</h2>
                    <button class="cool-border" id="grantpermission">Grant permission</button>
                </div>
            `;

        document.querySelector("#grantpermission").addEventListener("click", () => grantPermission());
        return;
    }

    document.getElementsByTagName('body')[0].style.backgroundPosition = '0% 0';

    let tab = (await browser.tabs.query({ active: true, currentWindow: true }))[0];
    let url = tab.url;
    tabId = tab.id;
    if (/^https?:\/\/cts.strath.ac.uk\/Scientia\/live2324sws\/showtimetable.aspx/.test(url)) {
        document.getElementById("popup-content-wrong-page").style.display = "none";
        document.getElementById("export-ics").addEventListener("click", beginExportICS);
    } else {
        document.getElementById("popup-content").style.display = "none";
        await setupYearList();
        await setupSemesterList();
        await setupCourseList();
        document.getElementById("submit").addEventListener("click", async () => {
            await openTimetable();
        });
    }
}

document.addEventListener('DOMContentLoaded', contentLoaded);

async function setupCourseList() {
    var config = {
        placeHolder: "Loading courses, please wait",
        data: {
            src: [],
            keys: ["name"],
        },
        resultItem: {
            highlight: true,
        },
        resultsList: {
            maxResults: 20,
        },
        selector: "#course"
    };
    const course = new autoComplete(config);

    let i = 0;
    let timer = setInterval(() => {
        i = (i + 1) % 3;
        document.getElementById("course").setAttribute("placeholder", "Loading courses, please wait" + ".".repeat(i + 1));
    }, 500);
    let courses = (await fetchCourseList()).filter((c, i, a) => a.findIndex((x) => x.name == c.name) === i);

    document.querySelector("#course").addEventListener("selection", (e) => {
        document.querySelector("#course").value = e.detail.selection.value.name;
        populateYearList(e.detail.selection.value);
    });

    clearInterval(timer);
    document.getElementById("course").setAttribute("placeholder", "Select a course");
    course.data.src = courses;
}

async function setupYearList() {
    let config = {
        placeHolder: "Select a year",
        data: {
            src: [],
        },
        resultItem: {
            highlight: true,
        },
        resultsList: {
            maxResults: 20,
        },
        selector: "#year"
    };

    yearAutoComplete = new autoComplete(config);
}

async function setupSemesterList() {
    let config = {
        placeHolder: "Select a semester",
        data: {
            src: [],
        },
        resultItem: {
            highlight: true,
        },
        resultsList: {
            maxResults: 20,
        },
        selector: "#semester",
        trigger: () => true,
    };

    semesterAutoComplete = new autoComplete(config);

    let semesters = [{ code: 1, name: "Semester 1" }, { code: 2, name: "Semester 2" }, { code: 0, name: "Both semesters" }];
    console.log(semesters);
    semesterAutoComplete.data.src = semesters;
    semesterAutoComplete.data.keys = ["name"];
    document.querySelector("#semester").addEventListener("selection", (e) => {
        document.querySelector("#semester").value = e.detail.selection.value.name;
        semester = e.detail.selection.value.code;
        console.log(semester);
    });
    document.querySelector("#semester").addEventListener("click", (e) => {
        semesterAutoComplete.start();
    });
}


document.addEventListener('pagehide', () => {
    document.getElementsByTagName('body')[0].style.backgroundPosition = '100% 0';
});

async function beginExportICS() {
    console.log("sending message...");
    await browser.tabs.sendMessage(tabId, { command: "exportICS" });
    console.log("Sent message to content script");
}

async function fetchCourseList() {
    let cached = await browser.storage.local.get("courseList");
    if (cached.courseList) {
        return cached.courseList;
    }

    let url = "https://cts.strath.ac.uk/Scientia/live2324sws/default.aspx";

    let doc = await fetch(url)
        .then(r => r.text())
        .then(t => new DOMParser().parseFromString(t, "text/html"));

    let viewstate = doc.getElementById("__VIEWSTATE").value;
    let eventvalidation = doc.getElementById("__EVENTVALIDATION").value;
    let eventtarget = "LinkBtn_programmesofstudy";

    doc = await fetch("https://cts.strath.ac.uk/Scientia/live2324sws/default.aspx", {
        "credentials": "include",
        "headers": {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        "referrer": "https://cts.strath.ac.uk/Scientia/live2324sws/default.aspx",
        "body": `__VIEWSTATE=${encodeURIComponent(viewstate)}&__EVENTVALIDATION=${encodeURIComponent(eventvalidation)}&__EVENTTARGET=${encodeURIComponent(eventtarget)}&__EVENTARGUMENT=&__LASTFOCUS=&LinkBtn_programmesofstudy=Programmes+of+Study`,
        "method": "POST",
    })
        .then(r => r.text())
        .then(t => new DOMParser().parseFromString(t, "text/html"));

    viewstate = doc.getElementById("__VIEWSTATE").value;

    let courseList = [...doc.querySelector("#dlObject").children]
        .map(c => ({
            name: c.innerText.split('/')[0].trim(),
            code: c.getAttribute("value"),
            year: c.innerText.split('/')[1].trim(),
        }));

    browser.storage.local.set({ courseList });
    return courseList;
}

async function populateYearList(selected) {
    let years = (await fetchCourseList()).filter(c => c.name == selected.name)
    console.log(years);
    yearAutoComplete.data.src = years;
    yearAutoComplete.data.keys = ["year"];
    document.querySelector("#year").addEventListener("selection", (e) => {
        document.querySelector("#year").value = e.detail.selection.value.year;
        courseCode = e.detail.selection.value.code;
    });
}

function generateHash(string) {
    var hash = 0;
    if (string.length == 0)
        return hash;
    for (let i = 0; i < string.length; i++) {
        var charCode = string.charCodeAt(i);
        hash = ((hash << 7) - hash) + charCode;
        hash = hash & hash;
    }
    return hash;
}

async function openTimetable() {
    document.getElementById("submit").disabled = true;
    document.getElementById("submit").innerText = "Please wait...";

    let i = 0;
    let timer = setInterval(() => {
        i = (i + 1) % 3;
        document.getElementById("submit").innerText = "Please wait" + ".".repeat(i + 1);
    }, 500);

    let url = "https://cts.strath.ac.uk/Scientia/live2324sws/default.aspx";
    let resp = await fetch(url);
    let doc = await resp.text().then(t => new DOMParser().parseFromString(t, "text/html"));
    console.log(doc);

    let viewstate = doc.getElementById("__VIEWSTATE").value;
    console.log("vs1: ", generateHash(viewstate));
    let eventvalidation = doc.getElementById("__EVENTVALIDATION").value;
    let eventtarget = "LinkBtn_programmesofstudy";
    let viewstategenerator = doc.getElementById("__VIEWSTATEGENERATOR").value;

    resp = await fetch("https://cts.strath.ac.uk/Scientia/live2324sws/default.aspx", {
        "credentials": "include",
        "headers": {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        "referrer": "https://cts.strath.ac.uk/Scientia/live2324sws/default.aspx",
        "body": `__VIEWSTATE=${encodeURIComponent(viewstate)}&__EVENTVALIDATION=${encodeURIComponent(eventvalidation)}\
&__EVENTTARGET=${encodeURIComponent(eventtarget)}&__EVENTARGUMENT=&__LASTFOCUS=&LinkBtn_programmesofstudy=Programmes+of+Study\
&__VIEWSTATEGENERATOR=${encodeURIComponent(viewstategenerator)}`,
        "method": "POST",
    });
    doc = await resp.text().then(t => new DOMParser().parseFromString(t, "text/html"));

    console.log(doc);
    viewstate = doc.getElementById("__VIEWSTATE").value;
    console.log("vs2: ", generateHash(viewstate));
    eventvalidation = doc.getElementById("__EVENTVALIDATION").value;
    viewstategenerator = doc.getElementById("__VIEWSTATEGENERATOR").value;

    let weeks;
    if (semester == 0) {
        weeks = "8;9;10;11;12;13;14;15;16;17;18;25;26;27;28;29;30;31;32;33;34;35";
    } else if (semester == 1) {
        weeks = "8;9;10;11;12;13;14;15;16;17;18";
    } else if (semester == 2) {
        weeks = "25;26;27;28;29;30;31;32;33;34;35";
    }

    resp = await fetch("https://cts.strath.ac.uk/Scientia/live2324sws/default.aspx", {
        "credentials": "include",
        "headers": {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        "referrer": "https://cts.strath.ac.uk/Scientia/live2324sws/default.aspx",
        "body": `__EVENTTARGET=&__EVENTARGUMENT=&__LASTFOCUS=&__VIEWSTATE=${encodeURIComponent(viewstate)}\
&__VIEWSTATEGENERATOR=${encodeURIComponent(viewstategenerator)}&__EVENTVALIDATION=${encodeURIComponent(eventvalidation)}\
&tLinkType=programmesofstudy&dlFilter=&tWildcard=&dlObject=${encodeURIComponent(courseCode)}\
&lbWeeks=${weeks}&lbDays=1-5&dlPeriod=3-18&dlType=Individual%3Bswsurl%3BSWSCUST+Programme+of+Study+Individual\
&bGetTimetable=View+Timetable`,
        "method": "POST",
    });

    doc = await resp.text().then(t => new DOMParser().parseFromString(t, "text/html"));

    await browser.storage.local.set({ timetable: doc.innerHTML });

    clearInterval(timer);

    await browser.tabs.create({
        url: "https://cts.strath.ac.uk/Scientia/live2324sws/showtimetable.aspx",
        active: true,
    });

}

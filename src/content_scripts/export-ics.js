const INJECTED_HELP = `<div id="injected" style="
align-items: center;
margin:20px;
padding: 20px;
font-family: &quot;Source Sans Pro&quot;, &quot;Helvetica Neue&quot;, Helvetica, Arial, sans-serif;
display: flex;
gap: 10px;
color: #fff;
font-size: 1rem;
line-height: 1.35;
border-style: none;
outline: none;
padding: 0.8em 1em;
border: 0.25em solid transparent;
background-image: linear-gradient(#0b1725, #0b1725),
    linear-gradient(120deg, #f09 0%, rgb(0, 98, 190) 50%, #f09 100%);
background-origin: border-box;
background-clip: padding-box, border-box;
background-size: 200% 100%;
background-position: 100% 0;
transition: background-position 0.8s ease-in-out;
">
<img src="https://github.com/strathclyde-coding-society/StrathHelper/blob/main/src/assets/logo.png?raw=true" style="height: 30px;width: 30px;/* display: inline; *//* vertical-align: middle; */"><span> Help: Click and drag to select modules to export. Blue modules will be included in the calendar file. Then select the extension and select "Export ICS".
</span>
</div>`;

function exportICS() {
    // How do I create a GUID / UUID?
    // https://stackoverflow.com/a/2117523
    const randomUUID = () => {
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    }

    // Formats the JS date time to the ICS format
    // ex: "2023-02-13T20:09:45.944Z" -> "2023-02-13T2009Z"
    const formatDateTime = (dateTimeISOString) => {
        let newTime = dateTimeISOString.replaceAll('-', '');
        newTime = newTime.replaceAll(':', '');
        newTime = newTime.slice(0, 15);
        return newTime + "Z";
    }

    let events = document.querySelectorAll('.selected-cell');
    events = Array.from(events).map(event => {
        let tds = event.querySelectorAll('td');
        let weeksText = tds[4].innerText;
        let parts = weeksText.split(',');
        let weeks = [];
        for (let part of parts) {
            if (part.includes('-')) {
                let start = parseInt(part.split('-')[0]);
                let end = parseInt(part.split('-')[1]);
                for (let i = start; i <= end; i++) weeks.push(i);
            } else {
                weeks.push(parseInt(part));
            }
        }

        let day = event.parentElement.children[0].innerText; // works if in first row
        let prevRow = event.parentElement.previousElementSibling;

        while (!["Mon", "Tue", "Wed", "Thu", "Fri"].includes(day)) {
            day = prevRow.querySelector('.row-label-one');
            if (day != null) { day = day.innerText }
            prevRow = prevRow.previousElementSibling;
        }

        // Summing up the sum of the colspans of the cells before which tells us what column the event starts in.
        let siblings = [...event.parentNode.children].filter(it => it.classList.contains("cell-border") || it.classList.contains("object-cell-border"));
        let index = siblings.indexOf(event);
        let siblingsBefore = siblings.slice(0, index);
        let colStart = 0;
        for (let sibling of siblingsBefore) {
            colStart += sibling.getAttribute("colspan") ? parseInt(sibling.getAttribute("colspan")) : 1;
        }


        return {
            day: day,
            start: colStart / 2,
            end: (colStart + parseInt(event.getAttribute("colspan"))) / 2,
            module: tds[0].innerText,
            type: tds[1].innerText,
            location: tds[2].innerText,
            weeks: weeks
        }
    });

    let calendar = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//SCS//NONSGML StrathHelper v1.0//EN\r\n"

    for (let event of events) {
        calendar += "BEGIN:VEVENT\r\n";
        calendar += "UID:" + randomUUID() + "\r\n";
        calendar += "DTSTAMP:" + formatDateTime(new Date().toISOString()) + "\r\n";
        calendar += "SUMMARY:" + event.module + ": " + event.type + "\r\n";
        calendar += "LOCATION:" + event.location + "\r\n";

        let date = new Date('2023-09-18 09:00:00');
        date.setTime(date.getTime() + (event.start) * 1000 * 60 * 60); // add start time

        let numDayOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(event.day);
        console.log(numDayOfWeek, date.getDay())
        date.setDate(date.getDate() + (numDayOfWeek - date.getDay())); // add day of week
        let dateWeekFirst = new Date(date);

        dateWeekFirst.setDate(date.getDate() + (event.weeks[0] - 8) * 7);
        calendar += "DTSTART:" + formatDateTime(dateWeekFirst.toISOString()) + "\r\n";
        let dateEnd = new Date(dateWeekFirst);

        dateEnd.setTime(dateEnd.getTime() + (event.end - event.start) * 1000 * 60 * 60); // add end time
        calendar += "DTEND:" + formatDateTime(dateEnd.toISOString()) + "\r\n";

        let rdates = []
        for (let week of event.weeks.slice(1)) {
            let dateWeek = new Date(date);
            dateWeek.setDate(dateWeek.getDate() + (week - 8) * 7);
            rdates.push(formatDateTime(dateWeek.toISOString()));
        }
        if (rdates.length > 0) {
            calendar += "RDATE:" + rdates.join(",") + "\r\n";
        }
        calendar += "STATUS:CONFIRMED\r\n";
        calendar += "END:VEVENT\r\n";
    }

    calendar += "END:VCALENDAR\r\n";

    // Perform line folding as per RFC 5545 (https://tools.ietf.org/html/rfc5545#section-3.1)
    // 75 characters per line, CRLF line endings followed by a single space
    calendar = calendar.replace(/(.{75})(?!\n)/g, "$1\r\n ");

    console.log(calendar);

    // https://stackoverflow.com/questions/3916191/download-data-url-file
    function downloadURI(uri, name) {
        var link = document.createElement("a");
        link.download = name;
        link.href = uri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    //List of regex of elements to extract, can modify easily by removing or adding regexs
    let regexs = [/[a-z A-Z]*[\/] Year [\d] /];
    let filename = "";
    regexs.forEach(regex => {
        filename += document.getElementsByClassName("header-3-0-5")[0].innerHTML.match(regex)[0]
    })
    console.log("downloading");
    downloadURI("data:text/calendar;charset=utf8," + encodeURIComponent(calendar), filename + ".ics");
}

function injectSelector() {
    document.querySelector(".header-border-args").insertAdjacentHTML('afterend', INJECTED_HELP);
    let grid = document.querySelector('.grid-border-args');
    let mouseOver = false, highlightState = false;

    document.querySelectorAll('.object-cell-border').forEach(cell => {
        if (cell.children[0].children[1].children[0].children[1].innerText == "Lecture") {
            cell.classList.add('selected-cell');
        } else {
            cell.classList.add('unselected-cell');
        }

        const toggle = () => {
            cell.classList.toggle('selected-cell');
            cell.classList.toggle('unselected-cell');
        };

        cell.addEventListener('mousedown', () => {
            toggle();
            mouseOver = true;
            highlightState = cell.classList.contains('selected-cell');

            grid.style.userSelect = 'none';
        });

        cell.addEventListener('mouseover', () => {
            if (mouseOver && highlightState !== cell.classList.contains('selected-cell')) {
                toggle();
            }
        });

    });
    grid.addEventListener('mouseup', () => {
        mouseOver = false;
        grid.style.userSelect = 'auto';
    });
}

console.log("export-ics.js loaded");

(async () => {
    let timetable = await browser.storage.local.get("timetable");

    if (timetable.timetable) {
        document.documentElement.innerHTML = timetable.timetable;
        await browser.storage.local.remove("timetable");
    } 
    injectSelector();
    browser.runtime.onMessage.addListener((message) => {
        if (message.command === "exportICS") {
            console.log("Exporting...");
            exportICS();
        } else {
            console.error("Unknown command: " + message.command);
        }
    });
})();

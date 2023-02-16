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

    let events = document.querySelectorAll('.object-cell-border');
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

        let date = new Date('2022-09-20 09:00:00');
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
    // window.open("data:text/calendar;charset=utf8," + encodeURIComponent(calendar));

    // https://stackoverflow.com/questions/3916191/download-data-url-file
    function downloadURI(uri, name) {
        var link = document.createElement("a");
        link.download = name;
        link.href = uri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        delete link;
      }
    
    //List of regex of elements to extract, can modify easily by removing or adding regexs
    let regexs = [/[a-z A-Z]*[\/] Year [\d] /, /[\d]{2}\/[\d]{2}/]
    let filename ="";
    regexs.forEach(regex=>{
        filename+=document.getElementsByClassName("header-3-0-5")[0].innerHTML.match(regex)[0]
    })
    downloadURI("data:text/calendar;charset=utf8," + encodeURIComponent(calendar),filename+".ics"); 
}

console.log("export-ics.js loaded");
browser.runtime.onMessage.addListener((message) => {
    if (message.command === "exportICS") {
        console.log("Exporting...");
        exportICS();
    } else {
        console.error("Unknown command: " + message.command);
    }
});
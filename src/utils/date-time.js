const SHORT_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTH_NAMES = ['January', 'Febraury', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const TINY_DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

module.exports.format = function (date, seperat) {
    const yyyy = date.getFullYear();
    const mm = date.getMonth() < 9 ? `0${date.getMonth() + 1}` : (date.getMonth() + 1); // getMonth() is zero-based
    const dd = date.getDate() < 10 ? `0${date.getDate()}` : date.getDate();
    const hh = date.getHours() < 10 ? `0${date.getHours()}` : date.getHours();
    const min = date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes();
    const ss = date.getSeconds() < 10 ? `0${date.getSeconds()}` : date.getSeconds();


    if (seperat) {
        return seperat
            .replace("yyyy", yyyy)
            .replace("yy", yyyy)
            .replace("MMMM", FULL_MONTH_NAMES[mm - 1])
            .replace("MMM", SHORT_MONTH_NAMES[mm - 1])
            .replace("MM", mm)
            //.replace("M", mm - 0) // This cause issue in the month of march as M in march is replaced
            .replace("DDDD", FULL_DAY_NAMES[date.getDay()])
            .replace("DDD", SHORT_DAY_NAMES[date.getDay()])
            .replace("dddd", FULL_DAY_NAMES[date.getDay()])
            .replace("ddd", SHORT_DAY_NAMES[date.getDay()])
            .replace("DD", TINY_DAY_NAMES[date.getDay()])
            .replace("dd", dd)
            //.replace("d", dd - 0) // For safety this was also removed
            .replace("HH", hh)
            .replace("H", hh - 0)
            .replace("hh", hh > 12 ? pad(hh - 12, 2) : hh)
            //.replace("h", hh > 12 ? hh - 12 : hh) // This also cause issue
            .replace("mm", min)
            .replace("ss", ss)
            .replace("tt", hh >= 12 ? "PM" : "AM")
            //.replace("t", hh >= 12 ? "P" : "A")
            ;
    }
    else {
        return "".concat(yyyy).concat(mm).concat(dd).concat(hh).concat(min).concat(ss);
    }
}

function pad(num, size) {
    let s = String(num);
    while (s.length < (size || 2)) { s = `0${s}`; }
    return s;
};


module.exports.parse = function parse(date) {
    if (!date) { return; }

    if (typeof date === 'string') {
        return new Date(date);
    }

    return date;
}
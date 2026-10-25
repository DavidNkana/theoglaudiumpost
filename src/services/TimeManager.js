const { LocalDate } = JSJoda;

const { DateTimeFormatter, Duration, LocalDateTime } = JSJoda;
const { Locale } = JSJodaLocale;

let addIntForDate = (num) => num >= 10 ? num : '0' + num;

const defaultFormat = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
    .withLocale(Locale.ENGLISH)
const thisYearFormat = DateTimeFormatter.ofPattern("E dd MMM, HH:ss")
    .withLocale(Locale.ENGLISH);
const otherYearFormat = DateTimeFormatter.ofPattern("dd/MM/yyyy, HH:ss")
    .withLocale(Locale.ENGLISH)
const todayFormat = DateTimeFormatter.ofPattern("HH:mm")
    .withLocale(Locale.ENGLISH)

let tomorrow = LocalDate.now().plusDays(1);
tomorrow = tomorrow._year + '-' + addIntForDate(tomorrow._month) + '-' + addIntForDate(tomorrow._day);

let yesterday = LocalDate.now().minusDays(1);
yesterday = yesterday._year + '-' + addIntForDate(yesterday._month) + '-' + addIntForDate(yesterday._day);



class TimeRangeManager {

    shortenDisplay(parsedDate) {
        if (!parsedDate) return `Invalid Date : ${parsedDate}`
        let formattedDate = LocalDateTime.parse(parsedDate, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
        let now = LocalDateTime.now()
        if (formattedDate.toLocalDate().equals(now.toLocalDate())) {
            return `Today at ` + formattedDate.format(todayFormat)
        } else if (formattedDate.toLocalDate().year() === now.toLocalDate().year()) {
            return formattedDate.format(thisYearFormat)
        } else {
            return formattedDate.format(otherYearFormat)
        }
    }

    shortenStandardDisplay(parsedDate) {
        if (!parsedDate) return null;
        parsedDate = parsedDate.replaceAll("T"," ");
        let formattedDate = LocalDateTime.parse(parsedDate, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
        let now = LocalDateTime.now()
        if (formattedDate.toLocalDate().equals(now.toLocalDate())) {
            return `Today at `+formatCustomDateTime(formattedDate,todayFormat)
        } else if (formattedDate.toLocalDate().year() === now.toLocalDate().year()) {
            return formatCustomDateTime(formattedDate,thisYearFormat)
        } else {
            return formatCustomDateTime(formattedDate,otherYearFormat)
        }
    }

    shortJavaDateTimeObject(javaDateTimeObject) {
        let date = javaDateTimeObject.date;
        let time = javaDateTimeObject.time;
        let parsedDate = `${date.year}-${addIntForDate(date.month)}-${addIntForDate(date.day)} ${addIntForDate(time.hour)}:${addIntForDate(time.minute)}:${addIntForDate(time.minute)}`;
        return this.shortenDisplay(parsedDate);
    }

    getNow() {
        let today = LocalDate.now();
        today = today._year + '-' + addIntForDate(today._month) + '-' + addIntForDate(today._day);
        return today;
    }

    getNowMinusDays(days) {
        let today = LocalDate.now().minusDays(days);
        today = today._year + '-' + addIntForDate(today._month) + '-' + addIntForDate(today._day);
        return today;
    }

    getToday() {
        let today = LocalDate.now();
        today = today._year+'-'+addIntForDate(today._month)+'-'+addIntForDate(today._day);
        return { From : today,To : tomorrow}
    }

    getYesterday() {
        let today = LocalDate.now();
        today = today._year+'-'+addIntForDate(today._month)+'-'+addIntForDate(today._day);

        let yesterday = LocalDate.now().minusDays(1);
        yesterday = yesterday._year+'-'+addIntForDate(yesterday._month)+'-'+addIntForDate(yesterday._day);
        return { From : yesterday,To : yesterday}
    }

    getLastWeek() {
        let startOfWeek = LocalDate.now().minusDays(7);
        startOfWeek = startOfWeek._year + '-' + addIntForDate(startOfWeek._month) + '-' + addIntForDate(startOfWeek._day)
        return {From: startOfWeek, To: this.getNow()}
    }


    getThisMonth() {
        let startOfMonth = LocalDate.now().withDayOfMonth(1)
            .format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        return {From: startOfMonth, To: this.getNow()}
    }

    getPreviousMonth() {
        let startOfMonth = LocalDate.now().withDayOfMonth(1)
            .format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));

        let startOfLastMonth = LocalDate.now().minusMonths(1).withDayOfMonth(1)
            .format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));

        return {From: startOfLastMonth, To: startOfMonth}
    }

    getThisYear() {
        let startOfYear = LocalDate.now()._year + '-01-01'
        return {From: startOfYear, To: this.getNow()}
    }

    getDateDiff(date1, date2) {
        date1 = LocalDateTime.parse(date1 + ' 00:00:00', DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
        date2 = LocalDateTime.parse(date2 + ' 00:00:00', DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
        let duration = Duration.between(date1, date2);
        return duration.toDays();
    }

    isGreaterThanTwoMonths(range) {
        return this.getDateDiff(range.From, range.To) >= 60;
    }

}

export default TimeRangeManager = new TimeRangeManager();

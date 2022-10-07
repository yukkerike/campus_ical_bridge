const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args))
const ical = require('ical-generator')
const express = require("express")
const app = express()
const path = require('path')

app.set("view engine", "hbs")
app.set('views', path.join(__dirname, "views"));
app.get("/", async (_, res) => {
    res.redirect(301, '/schedule/organizations')
})

app.get("/schedule", async (_, res) => {
    res.redirect(301, '/schedule/organizations')
})

app.get("/schedule/:entityId/sch.ics", async (req, res) => {
    const entityId = req.params.entityId
    res.set('Content-Type', 'text/calendar')
    res.send(createIcal(await fetch_schedule(entityId, getDate(20))))
})

app.get("/schedule/organizations", async (_, res) => {
    const organizations = await fetch_organizations()
    res.render('organizations', { cities: organizations });
})

app.get("/schedule/organizations/:entityId", async (req, res) => {
    res.render('groups_or_teachers', { organization: req.params.entityId });
})

app.get("/schedule/organizations/:entityId/schedule", async (req, res) => {
    let type = req.query.type
    let groups
    if (type === 'Group') {
        groups = await fetch_groups(req.params.entityId)
        type = "Группы"
    } else if (type === 'Teacher') {
        groups = await fetch_teachers(req.params.entityId)
        type = "Преподаватели"
    }
    res.render('groups', { groups: groups, for: type });
})

let getDate = (days) => {
    const isodate = (date) => {
        if (typeof date === 'number') date = new Date(date)
        return date.toISOString().split('T')[0]
    }
    const date = new Date()
    return [isodate(date), isodate(date.getTime() + days * 86400000)]
}

const fetch_schedule = async (groupId, date) => {
    return (await fetch(`https://api.campus.dewish.ru/v3/entities/${groupId}/schedule?from=${date[0]}&to=${date[1]}`)).json()
}

const fetch_organizations = async () => {
    return (await fetch('https://api.campus.dewish.ru/v3/organizations')).json()
}

const fetch_groups = async (organizationId) => {
    return (await fetch(`https://api.campus.dewish.ru/v3/organizations/${organizationId}/entities?type=Group`)).json()
}

const fetch_teachers = async (organizationId) => {
    return (await fetch(`https://api.campus.dewish.ru/v3/organizations/${organizationId}/entities?type=Teacher`)).json()
}

const createIcal = (schedule) => {
    const calendar = ical({ name: 'Расписание занятий', timezone: 'Europe/Moscow' })
    schedule.days.forEach(day => {
        if (day.intervals)
            day.intervals.forEach(interval => {
                const start = new Date(day.date)
                const startInterval = interval.start.split(':')
                start.setHours(startInterval[0])
                start.setMinutes(startInterval[1])
                const end = new Date(day.date)
                const endInterval = interval.end.split(':')
                end.setHours(endInterval[0])
                end.setMinutes(endInterval[1])
                let comment
                if (interval.lessons[0].teachers){
                    comment = interval.lessons[0].teachers.map(teacher => teacher.name).join(', ')
                } else {
                    comment = interval.lessons[0].comment
                }
                calendar.createEvent({
                    start: start,
                    end: end,
                    summary: interval.lessons[0].subject,
                    location: interval.lessons[0].classroom,
                    description: interval.lessons[0].type + '\n' + comment
                })
            })
    })
    return calendar.toString()
}

app.listen(process.env.PORT || 3000)
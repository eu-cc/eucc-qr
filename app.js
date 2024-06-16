const express = require('express')
const path = require('path')
const cors = require('cors')
const Airtable = require('airtable')
const bodyParser = require('body-parser')
const AirtableError = require('airtable/lib/airtable_error')
require('dotenv').config()

const app = express()
const port = 3000

// pug config
app.set('view engine', 'pug')
app.set('views', path.join(__dirname, 'views'))

// Airtable config
Airtable.configure({ apiKey: process.env.AIRTABLE_API_KEY })
const eucc_db = require('airtable').base('appwPwxy0ng15Ygab')

app.use(express.static(path.join(__dirname, 'static')))
app.use(cors())
app.use(express.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.get('/', (req, res) => {
  return res.status(404).send('Not found')
})

app.get('/m/:memberId', (req, res) => {
  const memberId = req.params.memberId
  let member = null
  let eventsList = []

  console.log(req.url, 'GET', req.body)

  // Fetch listed events
  eucc_db('Eventos')
    .select({
      maxRecords: 3,
      view: 'Todos los eventos',
      filterByFormula: '{Mostrar en QR-LandingPage}',
      fields: [
        'Nombre del evento',
        'Descripción',
        'Flyer',
        'Toma de asistencia',
        'Requerir código',
      ],
    })
    .eachPage(
      function page(records, fetchNextPage) {
        records.forEach(function (record) {
          const attendanceList = record.fields['Toma de asistencia'] || []
          record['takeAttendance'] = !attendanceList.includes(memberId)
          eventsList.push(record)
        })
        fetchNextPage()
      },
      function done(err) {
        if (err) {
          res.status(500).send(err)
          return
        }

        // Fetch member data
        eucc_db('Miembros').find(memberId, function (err, record) {
          if (err) {
            res.status(500).send(err)
            return
          }
          member = record.fields

          res.render('miembro', {
            member: member,
            member_id: memberId,
            events: eventsList,
          })
        })
      },
    )
})

app.post('/attendance', (req, res) => {
  const userKey = parseInt(req.body.userKey, 10)
  const eventId = req.body.eventId
  const memberId = req.body.memberId

  // verify event secret
  eucc_db('Eventos').find(eventId, function (err, record) {
    if (err) {
      console.error(err)
      res.status(500).send(err)
    }

    let eventSecret = null
    if (record.fields['Requerir código']) {
      eventSecret = record.fields['Código de sesión']
    } else {
      eventSecret = userKey
    }

    if (eventSecret === userKey) {
      const attendanceList = record.fields['Toma de asistencia'] || []

      eucc_db('Eventos').update(
        [
          {
            id: eventId,
            fields: {
              'Toma de asistencia': [...attendanceList, memberId],
            },
          },
        ],
        function (err, records) {
          if (err) {
            console.error(err)
            res.status(500).send(err)
          } else {
            res.status(200).send('Success.')
            records.forEach((record) => console.log(record.id))
          }
        },
      )
    } else {
      res.status(300).send('Wrong event key.')
    }
  })
})

app.listen(port, () => {
  console.log(`eucc-qr listening at ${port}`)
})

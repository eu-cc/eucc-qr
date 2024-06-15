const express = require('express')
const path = require('path')
const cors = require('cors')
const Airtable = require('airtable')
const bodyParser = require('body-parser')
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

app.get('/m/:id_miembro', (req, res) => {
  let member = null
  let member_id = null
  let events_list = []

  console.log(req.url, 'GET', req.body)

  // Fetch listed events
  eucc_db('Eventos')
    .select({
      maxRecords: 3,
      view: 'Todos los eventos',
      filterByFormula: '{Mostrar en QR-LandingPage}',
      fields: ['Nombre del evento', 'Descripción', 'Flyer'],
    })
    .eachPage(
      function page(records, fetchNextPage) {
        records.forEach(function (record) {
          events_list.push(record)
        })

        fetchNextPage()
      },
      function done(err) {
        if (err) {
          console.error(err)
          return
        }

        // Fetch member data
        eucc_db('Miembros').find(req.params.id_miembro, function (err, record) {
          if (err) {
            console.error(err)
            res.status(404).send('Not found.')
          }
          member = record.fields
          member_id = record.id

          res.render('miembro', {
            member: member,
            member_id: member_id,
            events: events_list,
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
      res.status(500).send('Unable to retrieve event.')
    }

    const eventSecret = record.fields['Código de sesión']

    if (eventSecret === userKey) {
      eucc_db('Asistencia').create(
        [
          {
            fields: {
              Miembro: [memberId],
              Evento: [eventId],
            },
          },
        ],
        function (err, records) {
          if (err) {
            console.error(err)
            res.status(500).send('Unable to register attendance.')
          } else {
            res.status(200).send('Success.')
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

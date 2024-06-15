const express = require('express')
const path = require('path')
const cors = require('cors')
const Airtable = require('airtable')
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

app.get('/', (req, res) => {
  return res.status(404).send('Not found')
})

app.get('/m/:id_miembro', (req, res) => {
  let member = null
  let events = []

  // Fetch listed events
  eucc_db('Eventos')
    .select({
      maxRecords: 3,
      view: 'Todos',
      filterByFormula: '{Mostrar en QR-LandingPage}',
      fields: [
        'Nombre del evento',
        'Descripción',
        '¿Se tomará asistencia?',
        'Flyer',
      ],
    })
    .eachPage(
      function page(records, fetchNextPage) {
        records.forEach(function (record) {
          console.log('Retrieved', record.get('Nombre del evento'))
          events.push(record)
          console.log(record.fields['Flyer'][0].url)
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

          res.render('miembro', {
            member: member,
            events: events,
          })
        })
      },
    )
})

app.post('attendance/:id_evento/:id_miembro', (req, res) => {
  const key = parseInt(req.body.number, 10)
})

app.listen(port, () => {
  console.log(`eucc-qr listening at ${port}`)
})

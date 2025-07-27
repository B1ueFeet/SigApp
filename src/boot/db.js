// src/boot/db.js
import { boot } from 'quasar/wrappers'
import initSqlJs from 'sql.js'
import dbService from 'src/services/db'

export default boot(async () => {
  const SQL = await initSqlJs({ locateFile: f => `https://sql.js.org/dist/${f}` })
  dbService.SQL = SQL
  await dbService.initDatabase()
})

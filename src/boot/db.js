// src/boot/db.js
import { boot } from 'quasar/wrappers'
import initSqlJs from 'sql.js'
import dbService from 'src/services/db'

export default boot(async () => {
  // 1) Carga SQL.js
  const SQL = await initSqlJs({ locateFile: file => `https://sql.js.org/dist/${file}` })
  dbService.SQL = SQL

  // 2) Inicializa la base (o la carga desde IndexedDB)
  await dbService.initDatabase()
})

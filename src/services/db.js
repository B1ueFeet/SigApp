import initSqlJs from 'sql.js'

const SQL = await initSqlJs({ locateFile: file => `https://sql.js.org/dist/${file}` })

export default {
  db: null,
  async initDatabase () {
    console.log('Inicializando base de datos')
    this.db = new SQL.Database()
    this.createTables()
    console.log('Base de datos lista')
  },
  createTables () {
    console.log('Creando tablas')
    this.db.run(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        phone TEXT,
        sector TEXT
      )
    `)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_code TEXT UNIQUE,
        description TEXT,
        price REAL,
        unit TEXT,
        common_name TEXT,
        materials TEXT
      )
    `)
    console.log('Tablas creadas')
  },
  exportData () {
    const data = this.db.export()
    console.log('Exportando BD', data)
    return data
  },
  importDatabase (arrayBuffer) {
    console.log('Importando base de datos')
    this.db = new SQL.Database(new Uint8Array(arrayBuffer))
    console.log('Base de datos importada')
  }
}

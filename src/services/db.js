// src/services/db.js
import localforage from 'localforage'

export default {
  SQL: null, 
  db: null,

  // 1) Inicializa usando IndexedDB si existe, o crea y guarda esquema
  async initDatabase() {
    if (!this.SQL) {
      throw new Error('SQL.js no ha sido asignado')
    }

    const saved = await localforage.getItem('sigapp-db')
    if (saved) {
      // cargamos export previo
      this.db = new this.SQL.Database(new Uint8Array(saved))
    }
    else {
      // arranque limpio
      this.db = new this.SQL.Database()
      this.createTables()
      await this.save()
    }
  },

  // crea tu esquema
  createTables() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        phone TEXT,
        sector TEXT
      )`)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_code TEXT UNIQUE,
        description TEXT,
        price REAL,
        unit TEXT,
        common_name TEXT,
        materials TEXT
      )`)
  },

  // 2) Guarda el estado actual en IndexedDB
  async save() {
    const data = this.db.export()
    await localforage.setItem('sigapp-db', data)
  },

  exportData() {
    return this.db.export()
  },

  // 3) Importa un ArrayBuffer y persiste inmediatamente
  async importDatabase(arrayBuffer) {
    this.db = new this.SQL.Database(new Uint8Array(arrayBuffer))
    await this.save()
  }
}

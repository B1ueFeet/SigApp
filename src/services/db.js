import localforage from 'localforage'

export default {
  SQL: null,
  db: null,

  async initDatabase() {
    if (!this.SQL) throw new Error('SQL.js no ha sido asignado')
    const saved = await localforage.getItem('sigapp-db')
    if (saved) {
      this.db = new this.SQL.Database(new Uint8Array(saved))
    }
    else {
      this.db = new this.SQL.Database()
      this.createTables()
      await this.save()
    }
  },

  createTables() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, phone TEXT, sector TEXT
      );
    `)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_code TEXT UNIQUE,
        description TEXT, price REAL, unit TEXT, common_name TEXT
      );
    `)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        description TEXT
      );
    `)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS product_material (
        product_id INTEGER,
        material_id INTEGER,
        PRIMARY KEY(product_id, material_id)
      );
    `)
  },

  async save() {
    const data = this.db.export()
    await localforage.setItem('sigapp-db', data)
  },

  exportData() {
    return this.db.export()
  },

  async importDatabase(buf) {
    this.db = new this.SQL.Database(new Uint8Array(buf))
    await this.save()
  },

  // genera el siguiente código para un prefijo dado ('P','M','S')
  nextProductCode(prefix) {
    const stmt = this.db.prepare(`
      SELECT product_code FROM products
      WHERE product_code LIKE ? ORDER BY product_code DESC LIMIT 1
    `)
    stmt.bind([`${prefix}%`])
    let next = 1
    if (stmt.step()) {
      const last = stmt.getAsObject().product_code  // ej. 'P00010'
      const num = parseInt(last.slice(1), 10)
      next = num + 1
    }
    stmt.free()
    return prefix + String(next).padStart(4, '0')
  },

  // carga todos los materials
  loadMaterials() {
    const res = this.db.exec(`SELECT id,name,description FROM materials`)
    return (res[0]?.values||[]).map(([id,name,desc])=>({ id, name, description: desc }))
  },

  // carga los material_id asociados a un producto
  loadProductMaterials(productId) {
    const stmt = this.db.prepare(`
      SELECT material_id FROM product_material WHERE product_id = ?
    `)
    stmt.bind([productId])
    const result = []
    while(stmt.step()){
      result.push(stmt.get()[0])
    }
    stmt.free()
    return result
  },

  // guarda la relación muchos-a-muchos
  async saveProductMaterials(productId, materialIds) {
    // borramos previos
    this.db.run(`DELETE FROM product_material WHERE product_id = ?`, [productId])
    // insertamos nuevos
    const ins = this.db.prepare(`INSERT INTO product_material(product_id,material_id) VALUES(?,?)`)
    for(const mId of materialIds){
      ins.run([productId, mId])
    }
    ins.free()
    await this.save()
  }
}

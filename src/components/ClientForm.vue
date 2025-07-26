<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section>
        <q-select
          v-model="selectedClientId"
          :options="clients"
          option-value="id"
          option-label="name"
          label="Selecciona cliente"
          @input="onClientChange"
          emit-value
          map-options
        />
        <q-input
          v-model="form.name"
          label="Nombre"
          :disable="fieldsDisabled"
        />
        <q-input
          v-model="form.phone"
          label="Teléfono"
          :disable="fieldsDisabled"
        />
        <q-input
          v-model="form.sector"
          label="Sector"
          :disable="fieldsDisabled"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          :label="buttonLabel"
          @click="onAction"
          color="primary"
        />
        <q-btn
          v-if="selectedClientId"
          label="Cancelar"
          flat
          @click="resetSelection"
        />
      </q-card-actions>
    </q-card>
  </div>
</template>

<script>
import dbService from 'src/services/db'

export default {
  name: 'ClientForm',
  data() {
    return {
      clients: [],
      selectedClientId: null,
      form: {
        name: '',
        phone: '',
        sector: ''
      },
      isEditing: false
    }
  },
  computed: {
    fieldsDisabled() {
      if (!this.selectedClientId) return false
      return !this.isEditing
    },
    buttonLabel() {
      if (this.selectedClientId) {
        return this.isEditing ? 'Guardar cambios' : 'Editar'
      }
      return 'Añadir'
    }
  },
  created() {
    dbService.initDatabase().then(() => {
      this.loadClients()
    })
  },
  methods: {
    loadClients() {
      console.log('Cargando clientes')
      const res = dbService.db.exec('SELECT id, name FROM clients')
      this.clients = (res[0]?.values || []).map(([id, name]) => ({ id, name }))
      console.log('Clientes:', this.clients)
    },
    onClientChange() {
      console.log('Cliente seleccionado:', this.selectedClientId)
      if (this.selectedClientId) {
        const stmt = dbService.db.prepare(
          'SELECT name, phone, sector FROM clients WHERE id = ?'
        )
        stmt.bind([this.selectedClientId])
        if (stmt.step()) {
          const row = stmt.getAsObject()
          this.form = { ...row }
          console.log('Datos cliente:', row)
        }
        stmt.free()
        this.isEditing = false
      } else {
        this.resetForm()
        this.isEditing = true
      }
    },
    onAction() {
      if (this.selectedClientId) {
        this.isEditing ? this.saveClient() : this.isEditing = true
      } else {
        this.addClient()
      }
    },
    addClient() {
      console.log('Añadiendo cliente', this.form)
      dbService.db.run(
        'INSERT INTO clients (name, phone, sector) VALUES (?, ?, ?)',
        [this.form.name, this.form.phone, this.form.sector]
      )
      const res = dbService.db.exec('SELECT last_insert_rowid()')
      const newId = res[0].values[0][0]
      console.log('Cliente añadido con ID', newId)
      this.loadClients()
      this.selectedClientId = newId
      this.isEditing = false
    },
    saveClient() {
      console.log('Guardando cambios cliente', this.selectedClientId, this.form)
      dbService.db.run(
        'UPDATE clients SET name = ?, phone = ?, sector = ? WHERE id = ?',
        [this.form.name, this.form.phone, this.form.sector, this.selectedClientId]
      )
      console.log('Cliente actualizado')
      this.loadClients()
      this.isEditing = false
    },
    resetSelection() {
      console.log('Cancelando edición')
      this.selectedClientId = null
      this.resetForm()
      this.isEditing = true
    },
    resetForm() {
      this.form = { name: '', phone: '', sector: '' }
    }
  }
}
</script>

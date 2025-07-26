<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section>
        <q-select
          v-model="selectedClientId"
          :options="clients"
          option-value="id"
          option-label="name"
          label="Selecciona cliente o crea uno nuevo"
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
          type="text"
          inputmode="numeric"
          maxlength="10"
          label="Teléfono"
          :disable="fieldsDisabled"
          @input="onPhoneInput"
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
          v-if="selectedClientId > 0"
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
      form: { name: '', phone: '', sector: '' },
      isEditing: false
    }
  },
  computed: {
    fieldsDisabled() {
      return this.selectedClientId > 0
        ? !this.isEditing
        : false
    },
    buttonLabel() {
      return this.selectedClientId > 0
        ? (this.isEditing ? 'Guardar cambios' : 'Editar')
        : 'Añadir'
    }
  },
  watch: {
    selectedClientId() {
      this.onClientChange()
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
      const list = (res[0]?.values || []).map(([id, name]) => ({ id, name }))
      this.clients = [{ id: 0, name: 'Nuevo cliente' }, ...list]
      console.log('Clientes:', this.clients)
    },
    onClientChange() {
      console.log('Cliente seleccionado:', this.selectedClientId)
      if (this.selectedClientId > 0) {
        const stmt = dbService.db.prepare(
          'SELECT name, phone, sector FROM clients WHERE id = ?'
        )
        stmt.bind([this.selectedClientId])
        if (stmt.step()) {
          this.form = stmt.getAsObject()
          console.log('Datos cliente:', this.form)
        }
        stmt.free()
        this.isEditing = false
      } else {
        this.resetForm()
        this.isEditing = true
      }
    },
    onPhoneInput(val) {
      const digits = (val || '').replace(/\D/g, '').slice(0, 10)
      this.form.phone = digits
      console.log('Teléfono actual:', this.form.phone)
    },
    onAction() {
      if (this.selectedClientId > 0) {
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
      this.selectedClientId = 0
      this.resetForm()
      this.isEditing = true
    },
    resetForm() {
      this.form = { name: '', phone: '', sector: '' }
    }
  }
}
</script>

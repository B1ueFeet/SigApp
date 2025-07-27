<template>
  <q-card flat bordered class="q-pa-md">
    <q-input v-model="form.name" label="Nombre de material" />
    <q-input v-model="form.description" label="Descripción" type="textarea" />
    <div class="row justify-end q-mt-md">
      <q-btn label="Añadir" color="primary" @click="onAdd" />
    </div>
  </q-card>
</template>

<script>
import dbService from 'src/services/db'

export default {
  name: 'MaterialForm',
  data() {
    return {
      form: { name: '', description: '' }
    }
  },
  methods: {
    async onAdd() {
      dbService.db.run(
        'INSERT OR IGNORE INTO materials(name,description) VALUES(?,?)',
        [this.form.name, this.form.description]
      )
      await dbService.save()
      this.$emit('added')
      this.form = { name:'', description:'' }
    }
  }
}
</script>

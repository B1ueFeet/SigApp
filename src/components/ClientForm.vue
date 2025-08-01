<!-- src/components/ClientForm.vue -->
<template>
    <div class="q-pa-md">
        <q-card flat bordered>
            <q-card-section>
                <q-select v-model="selectedClientId" :options="clients" option-value="id" option-label="name"
                    label="Selecciona cliente o crea uno nuevo" emit-value map-options clearable />

                <q-input v-model="form.name" label="Nombre" :disable="fieldsDisabled" class="q-mt-sm" />
                <q-input v-model="form.phone" label="Teléfono" type="text" inputmode="numeric" maxlength="10"
                    :disable="fieldsDisabled" @input="onPhoneInput" class="q-mt-sm" />
                <q-input v-model="form.sector" label="Sector" :disable="fieldsDisabled" class="q-mt-sm" />
            </q-card-section>

            <q-card-actions align="right">
                <q-btn :label="buttonLabel" @click="onAction" color="primary" />
                <q-btn v-if="selectedClientId > 0" label="Cancelar" flat @click="resetSelection" />
            </q-card-actions>
        </q-card>
    </div>
</template>

<script>
import dbService from 'src/services/db'

export default {
    name: 'ClientForm',

    props: {
        modelValue: {
            type: Object,
            default: () => ({ id: 0, name: '', phone: '', sector: '' })
        }
    },
    emits: ['update:modelValue', 'onClientSelected'],

    data() {
        return {
            clients: [],
            selectedClientId: this.modelValue.id || 0,
            form: { ...this.modelValue },
            isEditing: false
        }
    },

    computed: {
        fieldsDisabled() {
            return this.selectedClientId > 0 && !this.isEditing
        },
        buttonLabel() {
            if (this.selectedClientId > 0) {
                return this.isEditing ? 'Guardar cambios' : 'Editar'
            }
            return 'Añadir'
        }
    },

    watch: {
        // cuando cambie la selección, recarga el formulario
        selectedClientId() {
            this.onClientChange()
        },
        // si el padre modifica el cliente (indices externa), sincroniza
        modelValue: {
            handler(val) {
                this.form = { ...val }
                this.selectedClientId = val.id || 0
            },
            deep: true
        }
    },

    methods: {
        async loadClients() {
            const res = dbService.db.exec('SELECT id, name FROM clients ORDER BY name')
            const list = (res[0]?.values || []).map(([id, name]) => ({ id, name }))
            this.clients = [{ id: 0, name: 'Nuevo cliente' }, ...list]
        },

        onClientChange() {
            if (this.selectedClientId > 0) {
                // cargar cliente existente
                const stmt = dbService.db.prepare(
                    'SELECT id, name, phone, sector FROM clients WHERE id = ?'
                )
                stmt.bind([this.selectedClientId])
                if (stmt.step()) {
                    this.form = stmt.getAsObject()
                }
                stmt.free()
                this.isEditing = false
            }
            else {
                // nuevo cliente
                this.resetForm()
                this.isEditing = true
            }
            // notificar al padre
            this.$emit('update:modelValue', this.form)
            this.$emit('onClientSelected', this.form)
        },

        onPhoneInput(val) {
            this.form.phone = (val || '').replace(/\D/g, '').slice(0, 10)
        },

        async onAction() {
            if (this.selectedClientId > 0) {
                if (this.isEditing) {
                    await this.saveClient()
                }
                else {
                    this.isEditing = true
                }
            }
            else {
                await this.addClient()
            }
        },

        async addClient() {
            dbService.db.run(
                'INSERT INTO clients (name, phone, sector) VALUES (?, ?, ?)',
                [this.form.name, this.form.phone, this.form.sector]
            )
            await dbService.save()
            const res = dbService.db.exec('SELECT last_insert_rowid()')
            const newId = res[0].values[0][0]
            this.selectedClientId = newId
            this.form.id = newId
            this.isEditing = false
            await this.loadClients()
            this.$emit('update:modelValue', this.form)
            this.$emit('onClientSelected', this.form)
        },

        async saveClient() {
            dbService.db.run(
                'UPDATE clients SET name = ?, phone = ?, sector = ? WHERE id = ?',
                [this.form.name, this.form.phone, this.form.sector, this.selectedClientId]
            )
            await dbService.save()
            this.isEditing = false
            await this.loadClients()
            this.$emit('update:modelValue', this.form)
            this.$emit('onClientSelected', this.form)
        },

        resetSelection() {
            this.selectedClientId = 0
            this.resetForm()
            this.isEditing = true
            this.$emit('update:modelValue', this.form)
            this.$emit('onClientSelected', this.form)
        },

        resetForm() {
            this.form = { id: 0, name: '', phone: '', sector: '' }
        },

        onDbImported() {
            this.loadClients()
        }
    },

    async mounted() {
        await dbService.initDatabase()
        await this.loadClients()
        // si al iniciar había un cliente en modelValue, cárgalo
        if (this.selectedClientId > 0) {
            this.onClientChange()
        }
        window.addEventListener('db-imported', this.onDbImported)
    },

    beforeUnmount() {
        window.removeEventListener('db-imported', this.onDbImported)
    }
}
</script>

<style scoped>
/* Opcional: algunos márgenes extra */
.q-mt-sm {
    margin-top: 0.5rem;
}
</style>

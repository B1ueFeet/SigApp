<!-- src/pages/QuotationHistoryPage.vue -->
<template>
    <q-page padding>

        <!-- filtros -->
        <div class="row q-col-gutter-md q-mb-md">
            <q-input v-model="filter" label="Buscar cliente/sector/teléfono" clearable dense debounce="300" />
            <q-input v-model="startDate" label="Desde" type="date" dense clearable />
            <q-input v-model="endDate" label="Hasta" type="date" dense clearable />
            <q-btn flat label="Limpiar" @click="clearFilters" />
        </div>

        <!-- lista expandible -->
        <q-list class="q-pa-md" dense bordered style="max-width: 100%">
            <q-expansion-item v-for="row in filteredHistory" :key="row.id" dense expand-separator>
                <!-- ROW HEADER -->
                <template v-slot:header>
                    <q-list class="q-pa-md" style="width: 100%">
                        <q-item dense>
                            <q-item-section>
                                {{ row.clientName }}
                            </q-item-section>
                            <q-item-section>
                                {{ formatCurrency(row.total) }}
                            </q-item-section>
                        </q-item>
                        <q-item>
                            <q-item-section>
                                {{ formatDate(row.date) }}
                            </q-item-section>
                        </q-item>
                    </q-list>

                </template>

                <q-list class="q-pa-md" style="max-width: 100%">
                    <q-item>
                        <q-item-section>
                            <q-item>
                                <q-item-section>
                                    Cliente: {{ row.clientName }}
                                </q-item-section>
                            </q-item>
                            <q-item>
                                <q-item-section>
                                    Sector: {{ row.clientSector }}
                                </q-item-section>
                            </q-item>
                            <q-item>
                                <q-item-section>
                                    Teléfono: {{ row.clientPhone }}
                                </q-item-section>
                            </q-item>
                        </q-item-section>
                        <q-item-section>
                            <q-item>
                                <q-item-section>
                                    SubTotal {{ formatCurrency(row.subtotal) }}
                                </q-item-section>
                            </q-item>
                            <q-item>
                                <q-item-section>
                                    IVA (15%): {{ formatCurrency(row.iva) }}
                                </q-item-section>
                            </q-item>
                            <q-item>
                                <q-item-section>
                                    Descuento: {{ formatCurrency(row.discount) }}
                                </q-item-section>
                            </q-item>
                            <q-item>
                                <q-item-section>
                                    Total: {{ formatCurrency(row.total) }}
                                </q-item-section>
                            </q-item>
                        </q-item-section>
                    </q-item>
                    <q-separator spaced />
                    <q-item>
                        <q-item-section>
                            <q-btn flat dense icon="edit" label="Editar" @click="editQuotation(row.id)" />
                        </q-item-section>
                        <q-item-section>
                            <q-btn flat dense color="negative" icon="delete" label="Eliminar"
                                @click="deleteQuotation(row.id)" />
                        </q-item-section>
                    </q-item>

                </q-list>
            </q-expansion-item>
        </q-list>

    </q-page>
</template>

<script>
import dbService from 'src/services/db'

export default {
    name: 'QuotationHistoryPage',
    data() {
        return {
            history: [],
            clientMap: {},
            filter: '',
            startDate: null,
            endDate: null
        }
    },
    computed: {
        filteredHistory() {
            return this.history.filter(row => {
                if (this.startDate && row.date < this.startDate) return false
                if (this.endDate && row.date > this.endDate) return false

                const txt = this.filter.trim().toLowerCase()
                if (txt) {
                    return (
                        row.clientName.toLowerCase().includes(txt) ||
                        row.clientSector.toLowerCase().includes(txt) ||
                        row.clientPhone.toLowerCase().includes(txt)
                    )
                }
                return true
            })
        }
    },
    methods: {
        async loadHistory() {
            await dbService.initDatabase()

            // cargar clientes
            const cl = dbService.db.exec(`
        SELECT id,name,phone,sector FROM clients
      `)[0]?.values || []
            cl.forEach(([id, name, phone, sector]) => {
                this.clientMap[id] = { name, phone, sector }
            })
            console.log('Clientes cargados:', this.clientMap)

            // cargar cotizaciones
            const heads = dbService.loadQuotations()   // {id, date, client_id, apply_taxes, discount}
            console.log('Cotizaciones cargadas:', heads)
            this.history = heads.map(q => {
                const full = dbService.loadQuotationById(q.id)
                const subtotal = full.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
                const iva = full.apply_taxes ? subtotal * 0.15 : 0
                const total = subtotal + iva - full.discount
                const cl = this.clientMap[q.client_id] || {}
                return {
                    id: q.id,
                    date: q.date.slice(0, 10),
                    clientName: cl.name || '—',
                    clientPhone: cl.phone || '—',
                    clientSector: cl.sector || '—',
                    subtotal, iva,
                    discount: full.discount,
                    total
                }
            })
        },
        formatDate(d) {
            return new Date(d).toLocaleDateString('es-ES')
        },
        formatCurrency(v) {
            return `$ ${v.toFixed(2)}`
        },
        clearFilters() {
            this.filter = ''
            this.startDate = null
            this.endDate = null
        },
        editQuotation(id) {
            this.$router.push({ path: '/', query: { editId: id } })
        },
        async deleteQuotation(id) {
            await dbService.deleteQuotation(id)
            this.loadHistory()
        }
    },
    mounted() {
        this.loadHistory()
    }
}
</script>

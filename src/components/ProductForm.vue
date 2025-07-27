<!-- src/components/ProductForm.vue -->
<template>
    <div class="q-pa-md">
        <q-card flat bordered>

            <!-- CABECERA: selector de producto, tipo y código -->
            <q-card-section class="row items-center q-col-gutter-md">
                <q-select v-model="selectedProductId" :options="products" option-value="id" option-label="common_name"
                    label="Selecciona producto" emit-value map-options style="width: 250px" />

                <q-select v-model="productType" :options="typeOptions" option-value="value" option-label="label"
                    emit-value map-options label="Tipo" :disable="selectedProductId > 0" style="width: 200px" />

                <q-input v-model="form.product_code" label="Código" readonly style="width: 160px" />
            </q-card-section>

            <!-- CUERPO: datos básicos -->
            <q-card-section>
                <q-input v-model="form.common_name" label="Nombre común" :disable="fieldsDisabled" />
                <q-input v-model="form.description" label="Descripción" :disable="fieldsDisabled" />
                <q-input v-model="form.price" label="Precio" type="text" inputmode="decimal" maxlength="15"
                    :disable="fieldsDisabled" @input="onPriceInput" @blur="formatPrice" />
                <q-select v-model="form.unit" :options="unitOptions" option-value="value" option-label="label"
                    label="Unidad" :disable="fieldsDisabled" />

                <!-- Materiales con tabla y checkboxes -->
                <div class="q-mt-md">
                    <div class="text-subtitle1">Materiales</div>
                    <q-table :rows="materialOptions" row-key="id" flat dense class="q-mt-sm">
                        <template v-slot:header>
                            <q-tr>
                                <q-th style="width: 60px">Incl.</q-th>
                                <q-th>Nombre</q-th>
                                <q-th>Descripción</q-th>
                            </q-tr>
                        </template>
                        <template v-slot:body="props">
                            <q-tr :props="props">
                                <q-td>
                                    <q-checkbox :model-value="selectedMaterials.includes(props.row.id)"
                                        @update:model-value="val => onMaterialCheck(props.row.id, val)"
                                        :disable="fieldsDisabled" />
                                </q-td>
                                <q-td>{{ props.row.name }}</q-td>
                                <q-td>{{ props.row.description }}</q-td>
                            </q-tr>
                        </template>
                    </q-table>
                    <q-btn label="Nuevo material" icon="add" flat class="q-mt-sm" @click="showMaterialDialog = true"
                        :disable="fieldsDisabled" />
                </div>
            </q-card-section>

            <!-- ACCIONES -->
            <q-card-actions align="right">
                <q-btn :label="buttonLabel" color="primary" @click="onAction" />
                <q-btn v-if="selectedProductId > 0" flat label="Cancelar" @click="resetSelection" />
            </q-card-actions>

        </q-card>

        <!-- DIÁLOGO PARA CREAR NUEVO MATERIAL -->
        <q-dialog v-model="showMaterialDialog">
            <q-card>
                <q-card-section>
                    <material-form @added="onMaterialAdded" @saved="onMaterialAdded" />
                </q-card-section>
                <q-card-actions align="right">
                    <q-btn flat label="Cerrar" @click="showMaterialDialog = false" />
                </q-card-actions>
            </q-card>
        </q-dialog>
    </div>
</template>

<script>
import dbService from 'src/services/db'
import MaterialForm from './MaterialForm.vue'

export default {
    name: 'ProductForm',
    components: { MaterialForm },
    data() {
        return {
            products: [],
            selectedProductId: 0,
            productType: 'P',
            form: { common_name: '', product_code: '', description: '', price: '', unit: '' },
            selectedMaterials: [],
            materialOptions: [],
            isEditing: false,
            showMaterialDialog: false,
            unitOptions: [
                { value: 'u', label: 'unidad' },
                { value: 'm2', label: 'metros cuadrados' },
                { value: 'm3', label: 'metros cúbicos' },
                { value: 'ml', label: 'metros lineales' }
            ],
            typeOptions: [
                { value: 'P', label: 'Producto (P)' },
                { value: 'S', label: 'Servicio (S)' },
                { value: 'M', label: 'Mano de Obra (M)' }
            ]
        }
    },
    watch: {
        selectedProductId() {
            this.onProductChange()
        },
        productType(newType) {
            if (this.selectedProductId === 0) {
                this.form.product_code = dbService.nextProductCode(newType)
            }
        }
    },
    computed: {
        fieldsDisabled() {
            return this.selectedProductId > 0 ? !this.isEditing : false
        },
        buttonLabel() {
            return this.selectedProductId > 0
                ? (this.isEditing ? 'Guardar cambios' : 'Editar')
                : 'Añadir'
        }
    },
    methods: {
        loadProducts() {
            const res = dbService.db.exec(`SELECT id, common_name FROM products`)
            this.products = [{ id: 0, common_name: 'Nuevo producto' }]
                ; (res[0]?.values || []).forEach(([id, cn]) => {
                    this.products.push({ id, common_name: cn })
                })
        },
        loadMaterialOptions() {
            this.materialOptions = dbService.loadMaterials()
        },
        onMaterialAdded() {
            this.loadMaterialOptions()
            this.showMaterialDialog = false
        },
        onMaterialCheck(materialId, checked) {
            const idx = this.selectedMaterials.indexOf(materialId)
            if (checked && idx === -1) {
                this.selectedMaterials.push(materialId)
            } else if (!checked && idx !== -1) {
                this.selectedMaterials.splice(idx, 1)
            }
            this.onMaterialsChange()
        },
        onMaterialsChange() {
            if (this.selectedProductId > 0) {
                dbService.saveProductMaterials(this.selectedProductId, this.selectedMaterials)
                    .then(() => dbService.save())
            }
        },
        onProductChange() {
            if (this.selectedProductId > 0) {
                const stmt = dbService.db.prepare(`
          SELECT common_name, product_code, description, price, unit
          FROM products WHERE id = ?
        `)
                stmt.bind([this.selectedProductId])
                if (stmt.step()) {
                    this.form = stmt.getAsObject()
                }
                stmt.free()
                this.productType = this.form.product_code.charAt(0)
                this.selectedMaterials = dbService.loadProductMaterials(this.selectedProductId)
                this.isEditing = false
            } else {
                this.form = {
                    common_name: '',
                    product_code: dbService.nextProductCode(this.productType),
                    description: '',
                    price: '',
                    unit: ''
                }
                this.selectedMaterials = []
                this.isEditing = true
            }
            this.loadMaterialOptions()
        },
        onPriceInput(val) {
            let c = (val || '').replace(/[^0-9.]/g, '')
            const parts = c.split('.')
            if (parts.length > 1) c = parts[0] + '.' + parts.slice(1).join('')
            const [i, d = ''] = c.split('.')
            this.form.price = d ? `${i}.${d.slice(0, 2)}` : i
        },
        formatPrice() {
            const n = parseFloat(this.form.price)
            this.form.price = isNaN(n) ? '' : n.toFixed(2)
        },
        async onAction() {
            if (this.selectedProductId > 0) {
                if (this.isEditing) await this.saveProduct()
                else this.isEditing = true
            } else {
                await this.addProduct()
            }
        },
        async addProduct() {
            dbService.db.run(
                `INSERT INTO products
           (common_name, product_code, description, price, unit)
         VALUES (?, ?, ?, ?, ?)`,
                [
                    this.form.common_name,
                    this.form.product_code,
                    this.form.description,
                    parseFloat(this.form.price) || 0,
                    this.form.unit
                ]
            )
            const newId = dbService.db.exec('SELECT last_insert_rowid()')[0].values[0][0]
            await dbService.saveProductMaterials(newId, this.selectedMaterials)
            await dbService.save()
            this.selectedProductId = newId
            this.isEditing = false
            this.$emit('added')
        },
        async saveProduct() {
            dbService.db.run(
                `UPDATE products SET
           common_name = ?, product_code = ?, description = ?, price = ?, unit = ?
         WHERE id = ?`,
                [
                    this.form.common_name,
                    this.form.product_code,
                    this.form.description,
                    parseFloat(this.form.price) || 0,
                    this.form.unit,
                    this.selectedProductId
                ]
            )
            await dbService.saveProductMaterials(this.selectedProductId, this.selectedMaterials)
            await dbService.save()
            this.isEditing = false
            this.$emit('saved')
        },
        resetSelection() {
            this.selectedProductId = 0
            this.onProductChange()
        }
    },
    mounted() {
        this.loadProducts()
        this.loadMaterialOptions()
    }
}
</script>

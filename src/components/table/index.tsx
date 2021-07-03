import { Pager } from 'models/base'
import { NDataTable } from 'naive-ui'
import { dataTableProps } from 'naive-ui/lib/data-table/src/DataTable'
import {
  RowKey,
  SortState,
  TableColumns,
} from 'naive-ui/lib/data-table/src/interface'
import { UIStore } from 'stores/ui'
import { useInjector } from 'hooks/use-deps-injection'
import { defineComponent, reactive, ref, Ref, watch } from 'vue'
import {
  LocationQueryValue,
  onBeforeRouteUpdate,
  useRoute,
  useRouter,
} from 'vue-router'
import styles from './index.module.css'
export const tableRowStyle = styles['table-row']

const TableProps = [
  'data',
  'pager',
  'onUpdateCheckedRowKeys',
  'onUpdateSorter',
  'columns',
  'onFetchData',
  'nTableProps',
  'noPagination',
  'checkedRowKey',
  'maxWidth',
  'loading',
] as const

interface ITable<T = any> {
  data: Ref<T[]>
  pager: Ref<Pager>
  onUpdateCheckedRowKeys?: (keys: string[]) => void
  checkedRowKey?: string
  onUpdateSorter?: (
    sortProps: { sortBy: string; sortOrder: number },
    status: SortState,
  ) => void
  onFetchData: (
    page?: string | number | LocationQueryValue[],
    size?: number,
  ) => any
  columns: TableColumns<T>
  nTableProps: Partial<Record<keyof typeof dataTableProps, any>>
  noPagination?: boolean

  maxWidth?: number

  loading?: boolean
}

export const Table = defineComponent<ITable>((props, ctx) => {
  const {
    data,
    noPagination = false,
    pager,
    onUpdateCheckedRowKeys,
    onUpdateSorter,
    nTableProps,
    columns,
    onFetchData: fetchData,
    checkedRowKey = 'id',
    maxWidth = 1200,
  } = props

  const router = useRouter()
  const route = useRoute()
  const checkedRowKeys = ref<RowKey[]>([])
  const sortProps = reactive({
    sortBy: '',
    sortOrder: 0,
  })
  const loading = ref(true)

  // HACK
  const clean = watch(
    () => data.value,
    (n) => {
      // if (n.length) {

      // }
      loading.value = false
      clean()
    },
  )

  onBeforeRouteUpdate((to, from, next) => {
    loading.value = true
    next()
    loading.value = false
  })

  const ui = useInjector(UIStore)

  return () => (
    <NDataTable
      {...nTableProps}
      loading={props.loading ?? loading.value}
      remote
      scrollX={Math.max(ui.contentInsetWidth.value, maxWidth)}
      pagination={
        noPagination
          ? undefined
          : {
              page: pager.value.currentPage,
              pageSize: pager.value.size,
              pageCount: pager.value.totalPage,
              // showQuickJumper: ui.viewport.value.mobile ? false : true,
              showQuickJumper: true,
              pageSlot: ui.viewport.value.mobile
                ? ui.contentInsetWidth.value < 400
                  ? 2
                  : 3
                : undefined,
              onChange: async (page) => {
                router.push({
                  query: { ...route.query, page },
                  path: route.path,
                })
              },
            }
      }
      bordered={false}
      data={data.value}
      checkedRowKeys={checkedRowKeys.value}
      rowKey={(r) => r[checkedRowKey]}
      onUpdateCheckedRowKeys={(keys) => {
        checkedRowKeys.value = keys
        onUpdateCheckedRowKeys?.(keys as any)
      }}
      rowClassName={() => styles['table-row']}
      onUpdateSorter={async (status) => {
        if (!status) {
          return
        }

        columns.forEach((column) => {
          /** column.sortOrder !== undefined means it is uncontrolled */
          if (!('sortOrder' in column)) {
            return
          }
          if (column.sortOrder === undefined) return
          if (!status) {
            column.sortOrder = false
            return
          }
          if (column.key === status.columnKey) column.sortOrder = status.order
          else column.sortOrder = false
        })

        const { columnKey, order } = status

        sortProps.sortBy =
          sortProps.sortBy && sortProps.sortBy == columnKey
            ? ''
            : (columnKey as string)
        sortProps.sortOrder = order ? { descend: -1, ascend: 1 }[order] : 1
        onUpdateSorter?.(sortProps, status)
        await fetchData()
      }}
      columns={columns}
    ></NDataTable>
  )
})
Table.props = TableProps

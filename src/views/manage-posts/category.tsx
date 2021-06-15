import { React } from '@vicons/fa'
import { Add12Filled } from '@vicons/fluent'
import {
  HeaderActionButton,
  RoundedButton,
} from 'components/button/rounded-button'
import { Table } from 'components/table'
import { useTable } from 'hooks/use-table'
import { ContentLayout } from 'layouts/content'
import { TagModel } from 'models/category'
import {
  NBadge,
  NButton,
  NButtonGroup,
  NCard,
  NForm,
  NFormItemRow,
  NH3,
  NH4,
  NInput,
  NModal,
  NPopconfirm,
  NSpace,
  NTag,
  useMessage,
} from 'naive-ui'
import { CategoryStore } from 'stores/category'
import { useInjector } from 'utils/deps-injection'
import { RESTManager } from 'utils/rest'
import { defineComponent, onMounted, reactive, Ref, ref, watch } from 'vue'

export const CategoryView = defineComponent(props => {
  const categoryStore = useInjector(CategoryStore)

  const tags = reactive<TagModel[]>([])

  const fetchCategory = categoryStore.fetch
  // @ts-expect-error
  const { checkedRowKeys, pager } = useTable(() => fetchCategory)
  const message = useMessage()
  onMounted(async () => {
    await fetchCategory()
    const { data: $tags } = (await RESTManager.api.categories.get({
      params: { type: 'tag' },
    })) as any

    tags.push(...$tags)
  })

  const checkedTag = ref('')
  const showDialog = ref<boolean | string>(false)
  const resetState = () => ({ name: '', slug: '' })
  const editCategoryState = ref<CategoryState>(resetState())
  return () => (
    <ContentLayout
      actionsElement={
        <>
          <HeaderActionButton
            variant="success"
            icon={<Add12Filled />}
            onClick={() => {
              showDialog.value = true
              editCategoryState.value = resetState()
            }}
          ></HeaderActionButton>
        </>
      }
    >
      <NH3 prefix="bar">分类</NH3>

      {/* Action */}
      <EditCategoryDialog
        show={showDialog}
        onSubmit={async state => {
          const { name, slug } = state
          const id =
            typeof showDialog.value == 'string' ? showDialog.value : null
          if (!id) {
            const payload = (await RESTManager.api.categories.post({
              data: {
                name,
                slug,
              },
            })) as any
            message.success('创建成功')
            categoryStore.data.value!.push(payload.data)
          } else {
            await RESTManager.api.categories(id).put({
              data: {
                name,
                slug,
                type: 0,
              },
            })

            message.success('修改成功')

            const index = categoryStore.data.value!.findIndex(i => i.id == id)
            categoryStore.data.value![index] = {
              ...categoryStore.data.value![index],
              ...state,
            }
          }
        }}
        initialState={editCategoryState.value}
      />

      <Table
        data={categoryStore.data as any}
        onFetchData={fetchCategory}
        noPagination
        onUpdateCheckedRowKeys={keys => {
          checkedRowKeys.value = keys
        }}
        pager={pager}
        columns={[
          { title: '名称', key: 'name' },
          { title: '数', key: 'count' },
          { title: '路径', key: 'slug', width: 300 },
          {
            width: 300,
            title: '操作',
            key: 'id',
            render(row) {
              return (
                <NSpace size={12}>
                  <NButton
                    text
                    type="primary"
                    onClick={e => {
                      editCategoryState.value = {
                        name: row.name,
                        slug: row.slug,
                      }

                      showDialog.value = row.id
                    }}
                  >
                    编辑
                  </NButton>

                  <NPopconfirm
                    positiveText={'取消'}
                    negativeText="删除"
                    onNegativeClick={async () => {
                      await RESTManager.api.categories(row.id).delete()
                      message.success('删除成功')
                      await categoryStore.fetch(true)
                    }}
                  >
                    {{
                      trigger: () => (
                        <NButton text type="error">
                          移除
                        </NButton>
                      ),

                      default: () => (
                        <span style={{ maxWidth: '12rem' }}>
                          确定要删除 {row.title} ?
                        </span>
                      ),
                    }}
                  </NPopconfirm>
                </NSpace>
              )
            },
          },
        ]}
      ></Table>

      <NH3 prefix="bar">标签</NH3>
      <NSpace size={12}>
        {tags.map(tag => {
          return (
            <NBadge value={tag.count} key={tag.name}>
              <NTag
                class="border-gray-200 border"
                round
                type="success"
                checkable
                bordered
                checked={checkedTag.value == tag.name}
                onCheckedChange={check => {
                  if (check) {
                    checkedTag.value = tag.name
                  } else {
                    checkedTag.value = ''
                  }
                }}
              >
                {tag.name}
              </NTag>
            </NBadge>
          )
        })}
      </NSpace>
    </ContentLayout>
  )
})

type CategoryState = {
  name: string
  slug: string
}
const EditCategoryDialog = defineComponent<{
  initialState?: CategoryState
  onSubmit: (state: CategoryState) => void
  show: Ref<boolean | string>
}>(props => {
  const state = reactive<CategoryState>(
    props.initialState ?? { name: '', slug: '' },
  )

  watch(
    () => props.initialState,
    n => {
      if (n) {
        state.name = n.name
        state.slug = n.slug
      }
    },
  )
  const message = useMessage()
  const onSubmit = () => {
    if (!state.name || !state.slug) {
      message.error('名字 和 路径 不能为空')
      return
    }
    props.onSubmit(state)
    props.show.value = false
  }

  return () => (
    <NModal
      show={!!props.show.value}
      onUpdateShow={s => {
        props.show.value = s
      }}
    >
      {{
        default: () => (
          <NCard
            style="width: 400px;"
            headerStyle={{ textAlign: 'center' }}
            title={props.initialState ? '编辑' : '新建'}
          >
            <NForm
              onSubmit={onSubmit}
              rules={{
                name: {
                  required: true,
                  trigger: ['input', 'blur'],
                },
                slug: {
                  required: true,
                  trigger: ['input', 'blur'],
                },
              }}
            >
              <NFormItemRow path="name" label="名字">
                <NInput
                  placeholder=""
                  onInput={e => {
                    state.name = e
                  }}
                  value={state.name}
                ></NInput>
              </NFormItemRow>

              <NFormItemRow path="slug" label="路径">
                <NInput
                  placeholder=""
                  onInput={e => {
                    state.slug = e
                  }}
                  value={state.slug}
                ></NInput>
              </NFormItemRow>

              <div class="text-center">
                <NSpace size={12} align="center" inline>
                  <NButton type="success" onClick={onSubmit} round>
                    确定
                  </NButton>
                  <NButton onClick={() => (props.show.value = false)} round>
                    取消
                  </NButton>
                </NSpace>
              </div>
            </NForm>
          </NCard>
        ),
      }}
    </NModal>
  )
})

EditCategoryDialog.props = ['initialState', 'onSubmit', 'show'] as const

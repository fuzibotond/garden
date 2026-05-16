import { GardenColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  createGardenerPricingItem,
  deleteGardenerPricingItem,
  getGardenerPricingItems,
  updateGardenerPricingItem,
  type CreatePricingItemRequest,
  type PricingConditionDto,
  type PricingItemDto,
  type UpdatePricingItemRequest,
} from '@/services/api';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type ConditionRow = { key: string; value: string };

type PricingFormState = {
  name: string;
  description: string;
  priceAmount: string;
  priceUnit: string;
  conditions: ConditionRow[];
};

const emptyForm: PricingFormState = {
  name: '',
  description: '',
  priceAmount: '',
  priceUnit: 'DKK/m',
  conditions: [],
};

function itemToForm(item: PricingItemDto): PricingFormState {
  return {
    name: item.name,
    description: item.description ?? '',
    priceAmount: String(item.priceAmount),
    priceUnit: item.priceUnit,
    conditions: item.conditions.map((c) => ({ key: c.key, value: c.value })),
  };
}

function conditionsToDto(rows: ConditionRow[]): PricingConditionDto[] {
  return rows.filter((r) => r.key.trim() !== '').map((r) => ({ key: r.key.trim(), value: r.value.trim() }));
}

function PricingFormModal({
  visible,
  title,
  form,
  onChange,
  onSubmit,
  onClose,
  submitLabel,
  loading,
  error,
}: {
  visible: boolean;
  title: string;
  form: PricingFormState;
  onChange: (form: PricingFormState) => void;
  onSubmit: () => void;
  onClose: () => void;
  submitLabel: string;
  loading: boolean;
  error: string | null;
}) {
  function addCondition() {
    onChange({ ...form, conditions: [...form.conditions, { key: '', value: '' }] });
  }

  function updateCondition(index: number, field: 'key' | 'value', value: string) {
    const updated = form.conditions.map((r, i) => (i === index ? { ...r, [field]: value } : r));
    onChange({ ...form, conditions: updated });
  }

  function removeCondition(index: number) {
    onChange({ ...form, conditions: form.conditions.filter((_, i) => i !== index) });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>{title}</Text>

            <Text style={styles.fieldLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(v) => onChange({ ...form, name: v })}
              placeholder="e.g. Hedge trimming"
              placeholderTextColor={GardenColors.textMuted}
            />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={styles.input}
              value={form.description}
              onChangeText={(v) => onChange({ ...form, description: v })}
              placeholder="Optional description"
              placeholderTextColor={GardenColors.textMuted}
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.fieldLabel}>Price *</Text>
                <TextInput
                  style={styles.input}
                  value={form.priceAmount}
                  onChangeText={(v) => onChange({ ...form, priceAmount: v })}
                  keyboardType="decimal-pad"
                  placeholder="35"
                  placeholderTextColor={GardenColors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Unit *</Text>
                <TextInput
                  style={styles.input}
                  value={form.priceUnit}
                  onChangeText={(v) => onChange({ ...form, priceUnit: v })}
                  placeholder="DKK/m"
                  placeholderTextColor={GardenColors.textMuted}
                />
              </View>
            </View>

            <View style={styles.conditionsHeader}>
              <Text style={styles.fieldLabel}>Conditions</Text>
              <TouchableOpacity onPress={addCondition} style={styles.addConditionBtn}>
                <Text style={styles.addConditionText}>+ Add</Text>
              </TouchableOpacity>
            </View>
            {form.conditions.length === 0 && (
              <Text style={styles.emptyHint}>No conditions. Tap Add to describe when this price applies.</Text>
            )}
            {form.conditions.map((row, i) => (
              <View key={i} style={styles.conditionRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 4 }]}
                  value={row.key}
                  onChangeText={(v) => updateCondition(i, 'key', v)}
                  placeholder="e.g. height"
                  placeholderTextColor={GardenColors.textMuted}
                />
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 4 }]}
                  value={row.value}
                  onChangeText={(v) => updateCondition(i, 'value', v)}
                  placeholder="e.g. >200cm"
                  placeholderTextColor={GardenColors.textMuted}
                />
                <TouchableOpacity onPress={() => removeCondition(i)} style={styles.removeConditionBtn}>
                  <Text style={{ color: GardenColors.accent, fontWeight: '700' }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            {error != null && <Text style={styles.errorText}>{error}</Text>}

            <View style={[styles.row, { marginTop: 16 }]}>
              <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.submitBtn]} onPress={onSubmit} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#07140c" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>{submitLabel}</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function GardenerPricing() {
  const { token } = useAuth();
  const [items, setItems] = useState<PricingItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<PricingFormState>(emptyForm);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editing, setEditing] = useState<PricingItemDto | null>(null);
  const [editForm, setEditForm] = useState<PricingFormState>(emptyForm);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const pageSize = 20;

  const load = useCallback(
    async (p = 1) => {
      if (!token) return;
      try {
        const res = await getGardenerPricingItems(token, p, pageSize);
        if (p === 1) {
          setItems(res.items);
        } else {
          setItems((prev) => [...prev, ...res.items]);
        }
        setTotal(res.total);
        setPage(p);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pricing items');
      }
    },
    [token],
  );

  useEffect(() => {
    setLoading(true);
    void load(1).finally(() => setLoading(false));
  }, [load]);

  async function handleCreate() {
    if (!token || !createForm.name.trim() || !createForm.priceAmount) return;
    setCreateLoading(true);
    setCreateError(null);
    try {
      const body: CreatePricingItemRequest = {
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        priceAmount: Number(createForm.priceAmount),
        priceUnit: createForm.priceUnit.trim(),
        conditions: conditionsToDto(createForm.conditions),
      };
      await createGardenerPricingItem(token, body);
      setShowCreate(false);
      setCreateForm(emptyForm);
      setLoading(true);
      void load(1);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create pricing item');
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleUpdate() {
    if (!token || !editing) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const body: UpdatePricingItemRequest = {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        priceAmount: Number(editForm.priceAmount),
        priceUnit: editForm.priceUnit.trim(),
        conditions: conditionsToDto(editForm.conditions),
      };
      await updateGardenerPricingItem(token, editing.pricingItemId, body);
      setEditing(null);
      setEditForm(emptyForm);
      void load(1);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update pricing item');
    } finally {
      setEditLoading(false);
    }
  }

  function handleDelete(item: PricingItemDto) {
    if (!token) return;
    Alert.alert('Delete pricing item', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteGardenerPricingItem(token, item.pricingItemId);
            void load(1);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete');
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pricing</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            setCreateForm(emptyForm);
            setCreateError(null);
            setShowCreate(true);
          }}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {error != null && <Text style={styles.errorText}>{error}</Text>}

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load(1).finally(() => setRefreshing(false));
            }}
            tintColor={GardenColors.accent}
          />
        }
      >
        {loading && items.length === 0 ? (
          <ActivityIndicator color={GardenColors.accent} style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <Text style={styles.emptyText}>No pricing items yet. Tap + Add to create one.</Text>
        ) : (
          items.map((item) => (
            <View key={item.pricingItemId} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  {item.description != null && item.description !== '' && (
                    <Text style={styles.cardDesc}>{item.description}</Text>
                  )}
                </View>
                <Text style={styles.cardPrice}>
                  {item.priceAmount} {item.priceUnit}
                </Text>
              </View>
              {item.conditions.length > 0 && (
                <View style={styles.conditionTags}>
                  {item.conditions.map((c, i) => (
                    <View key={i} style={styles.conditionTag}>
                      <Text style={styles.conditionTagText}>
                        {c.key}: {c.value}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.editBtn]}
                  onPress={() => {
                    setEditing(item);
                    setEditForm(itemToForm(item));
                    setEditError(null);
                  }}
                >
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={() => handleDelete(item)}
                >
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        {items.length < total && (
          <TouchableOpacity style={styles.loadMoreBtn} onPress={() => void load(page + 1)}>
            <Text style={styles.loadMoreText}>Load more</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <PricingFormModal
        visible={showCreate}
        title="New pricing item"
        form={createForm}
        onChange={setCreateForm}
        onSubmit={handleCreate}
        onClose={() => setShowCreate(false)}
        submitLabel="Create"
        loading={createLoading}
        error={createError}
      />

      <PricingFormModal
        visible={editing != null}
        title="Edit pricing item"
        form={editForm}
        onChange={setEditForm}
        onSubmit={handleUpdate}
        onClose={() => setEditing(null)}
        submitLabel="Save"
        loading={editLoading}
        error={editError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GardenColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: 'rgba(7,20,12,0.97)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: GardenColors.text,
  },
  addBtn: {
    backgroundColor: GardenColors.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnText: {
    color: '#07140c',
    fontWeight: '700',
    fontSize: 14,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: GardenColors.text,
  },
  cardDesc: {
    fontSize: 12,
    color: GardenColors.textMuted,
    marginTop: 2,
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: GardenColors.accent,
    marginLeft: 12,
    whiteSpace: 'nowrap',
  },
  conditionTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
  conditionTag: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  conditionTagText: {
    fontSize: 11,
    color: GardenColors.textMuted,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    justifyContent: 'flex-end',
  },
  actionBtn: {
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  editBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  editBtnText: {
    color: GardenColors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  deleteBtnText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    color: GardenColors.textMuted,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  loadMoreBtn: {
    alignSelf: 'center',
    marginTop: 8,
    padding: 10,
  },
  loadMoreText: {
    color: GardenColors.accent,
    fontWeight: '600',
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    margin: 12,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0e2117',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '92%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: GardenColors.text,
    marginBottom: 16,
  },
  fieldLabel: {
    color: GardenColors.textMuted,
    fontSize: 12,
    marginBottom: 4,
    marginTop: 10,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
    color: GardenColors.text,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  conditionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 4,
  },
  addConditionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 6,
  },
  addConditionText: {
    color: GardenColors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  removeConditionBtn: {
    padding: 8,
  },
  emptyHint: {
    color: GardenColors.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  btn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginRight: 8,
  },
  cancelBtnText: {
    color: GardenColors.textMuted,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: GardenColors.accent,
  },
  submitBtnText: {
    color: '#07140c',
    fontWeight: '700',
    fontSize: 15,
  },
});

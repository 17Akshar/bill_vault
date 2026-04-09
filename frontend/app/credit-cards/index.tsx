import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR } from '../../utils/formatINR';

export default function CreditCardsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [tab, setTab] = useState<'cards'|'dues'|'emis'>('cards');
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [showEmiModal, setShowEmiModal] = useState(false);
  const [emiCard, setEmiCard] = useState<any>(null);
  const [emiForm, setEmiForm] = useState({ name: '', amount: '', tenure_remaining: '', total_tenure: '' });
  const [form, setForm] = useState({ name: '', card_number_last4: '', credit_limit: '', current_outstanding: '', billing_date: '1', due_date: '15', due_time: '10:00', interest_rate: '' });

  useEffect(() => { load(); }, []);
  const load = async () => { try { const r = await api.get('/credit-cards/report'); setReport(r.data); } catch(e){console.error(e)} finally{setLoading(false);setRefreshing(false)} };
  const onRefresh = useCallback(()=>{setRefreshing(true);load()},[]);

  const openEdit = (c: any) => {
    setEditItem(c);
    setForm({ name: c.name, card_number_last4: c.card_number_last4||'', credit_limit: String(c.credit_limit), current_outstanding: String(c.current_outstanding), billing_date: String(c.billing_date), due_date: String(c.due_date), due_time: c.due_time||'10:00', interest_rate: String(c.interest_rate||'') });
    setShowAdd(true);
  };

  const handleSave = async () => {
    if(!form.name.trim()){Alert.alert('Required','Enter card name');return}
    if(!form.credit_limit||parseFloat(form.credit_limit)<=0){Alert.alert('Required','Enter credit limit');return}
    setSaving(true);
    try {
      const payload: any = { name: form.name.trim(), credit_limit: parseFloat(form.credit_limit), current_outstanding: parseFloat(form.current_outstanding)||0, billing_date: parseInt(form.billing_date)||1, due_date: parseInt(form.due_date)||15, due_time: form.due_time||'10:00', interest_rate: parseFloat(form.interest_rate)||0 };
      if(!editItem) payload.card_number_last4 = form.card_number_last4;
      if(editItem) await api.put(`/credit-cards/${editItem.card_id}`, payload);
      else await api.post('/credit-cards', payload);
      setShowAdd(false); setEditItem(null); setForm({name:'',card_number_last4:'',credit_limit:'',current_outstanding:'',billing_date:'1',due_date:'15',due_time:'10:00',interest_rate:''}); load();
    } catch(e:any){Alert.alert('Error',e.response?.data?.detail||'Failed')} finally{setSaving(false)}
  };

  const handleDelete = (c: any) => Alert.alert('Delete',`Remove ${c.name}?`,[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:async()=>{try{await api.delete(`/credit-cards/${c.card_id}`);load()}catch{Alert.alert('Error','Failed')}}}]);

  const addEmi = async () => {
    if(!emiForm.name||!emiForm.amount){Alert.alert('Required','Fill EMI details');return}
    setSaving(true);
    try {
      const card = report.cards.find((c:any)=>c.card_id===emiCard.card_id);
      const emis = [...(card.emis||[]), {name:emiForm.name,amount:parseFloat(emiForm.amount),tenure_remaining:parseInt(emiForm.tenure_remaining)||0,total_tenure:parseInt(emiForm.total_tenure)||0}];
      await api.put(`/credit-cards/${emiCard.card_id}`, {emis});
      setShowEmiModal(false); setEmiForm({name:'',amount:'',tenure_remaining:'',total_tenure:''}); load();
    } catch{Alert.alert('Error','Failed')} finally{setSaving(false)}
  };

  const removeEmi = async (card: any, emiIdx: number) => {
    const emis = [...(card.emis||[])]; emis.splice(emiIdx,1);
    try{await api.put(`/credit-cards/${card.card_id}`,{emis});load()}catch{Alert.alert('Error','Failed')}
  };

  const toggleSelect = (id: string) => { const s = new Set(selectedCards); if(s.has(id)) s.delete(id); else s.add(id); setSelectedCards(s); };
  const getStatusColor = (s: string) => s==='overdue'?'#FF5252':s==='critical'?'#FF5252':s==='warning'?'#FFB300':'#00E676';

  if(loading) return <View style={[st.center,{backgroundColor:colors.background}]}><ActivityIndicator size="large" color={colors.primary}/></View>;

  const s = report?.summary||{};
  const cards = report?.cards||[];
  const dues = report?.upcoming_dues||[];
  const filteredCards = selectedCards.size>0 ? cards.filter((c:any)=>selectedCards.has(c.card_id)) : cards;
  const filteredTotal = filteredCards.reduce((sum:number,c:any)=>sum+c.current_outstanding,0);
  const filteredLimit = filteredCards.reduce((sum:number,c:any)=>sum+c.credit_limit,0);
  const allEmis = cards.flatMap((c:any)=>(c.emis||[]).map((e:any,i:number)=>({...e,card_name:c.name,card_id:c.card_id,emi_idx:i})));

  return (
    <SafeAreaView style={[st.container,{backgroundColor:colors.background}]}>
      <View style={st.header}>
        <TouchableOpacity onPress={()=>router.back()} style={st.backBtn}><Ionicons name="arrow-back" size={24} color={colors.text}/></TouchableOpacity>
        <Text style={[st.title,{color:colors.text}]}>Credit Cards</Text>
        <TouchableOpacity onPress={()=>{setEditItem(null);setForm({name:'',card_number_last4:'',credit_limit:'',current_outstanding:'',billing_date:'1',due_date:'15',due_time:'10:00',interest_rate:''});setShowAdd(true)}}><Ionicons name="add-circle" size={28} color={colors.primary}/></TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={[st.summaryCard,{backgroundColor:colors.card}]}>
        <View style={st.summaryRow}>
          <View style={st.summaryCol}><Text style={[st.sLabel,{color:colors.textSecondary}]}>Limit</Text><Text style={[st.sVal,{color:colors.text}]}>{formatINR(selectedCards.size>0?filteredLimit:s.total_limit||0)}</Text></View>
          <View style={st.summaryCol}><Text style={[st.sLabel,{color:colors.textSecondary}]}>Outstanding</Text><Text style={[st.sVal,{color:'#FF5252'}]}>{formatINR(selectedCards.size>0?filteredTotal:s.total_outstanding||0)}</Text></View>
          <View style={st.summaryCol}><Text style={[st.sLabel,{color:colors.textSecondary}]}>Available</Text><Text style={[st.sVal,{color:'#00E676'}]}>{formatINR(selectedCards.size>0?(filteredLimit-filteredTotal):(s.total_available||0))}</Text></View>
        </View>
        {s.total_emi>0&&<View style={st.emiSummary}><Ionicons name="calendar" size={14} color="#FFB300"/><Text style={{color:'#FFB300',fontSize:12,fontWeight:'600'}}>Total EMI: {formatINR(s.total_emi)}/mo</Text></View>}
      </View>

      {/* Tabs */}
      <View style={st.tabRow}>
        {(['cards','dues','emis'] as const).map(t=>(
          <TouchableOpacity key={t} style={[st.tabBtn,{borderColor:colors.border},tab===t&&{backgroundColor:colors.primary,borderColor:colors.primary}]} onPress={()=>setTab(t)}>
            <Text style={[st.tabText,{color:tab===t?'#FFF':colors.text}]}>{t==='cards'?'Cards':t==='dues'?'Due Dates':'EMIs'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filter chips for cards tab */}
      {tab==='cards'&&cards.length>1&&(
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.filterScroll} contentContainerStyle={{paddingHorizontal:20,gap:8}}>
          <TouchableOpacity style={[st.filterChip,{borderColor:colors.border},selectedCards.size===0&&{backgroundColor:colors.primary,borderColor:colors.primary}]} onPress={()=>setSelectedCards(new Set())}>
            <Text style={[st.filterText,{color:selectedCards.size===0?'#FFF':colors.text}]}>All</Text>
          </TouchableOpacity>
          {cards.map((c:any)=>{const sel=selectedCards.has(c.card_id);return(
            <TouchableOpacity key={c.card_id} style={[st.filterChip,{borderColor:colors.border},sel&&{backgroundColor:'#FF9100',borderColor:'#FF9100'}]} onPress={()=>toggleSelect(c.card_id)}>
              <Text style={[st.filterText,{color:sel?'#FFF':colors.text}]} numberOfLines={1}>{c.name}</Text>
            </TouchableOpacity>
          )})}
        </ScrollView>
      )}

      {tab==='cards'&&(
        <FlatList data={filteredCards} keyExtractor={i=>i.card_id} contentContainerStyle={st.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary}/>}
          renderItem={({item})=>{
            const usage=item.credit_limit>0?(item.current_outstanding/item.credit_limit*100):0;
            const avail=item.credit_limit-item.current_outstanding;
            const uColor=usage>90?'#FF5252':usage>70?'#FFB300':'#00E676';
            return(
              <TouchableOpacity style={[st.card,{backgroundColor:colors.card}]} onPress={()=>openEdit(item)} activeOpacity={0.7}>
                <View style={st.cardTop}>
                  <View style={[st.cardIcon,{backgroundColor:'rgba(255,145,0,0.12)'}]}><Ionicons name="card" size={20} color="#FF9100"/></View>
                  <View style={{flex:1}}><Text style={[st.cardName,{color:colors.text}]}>{item.name}</Text><Text style={[st.cardMeta,{color:colors.textSecondary}]}>{item.card_number_last4?`****${item.card_number_last4}`:''} · Due: {item.due_date}th {item.due_time||''}</Text></View>
                </View>
                <View style={st.cardStats}>
                  <View><Text style={[st.csLabel,{color:colors.textSecondary}]}>Limit</Text><Text style={[st.csVal,{color:colors.text}]}>{formatINR(item.credit_limit)}</Text></View>
                  <View style={{alignItems:'center'}}><Text style={[st.csLabel,{color:colors.textSecondary}]}>Outstanding</Text><Text style={[st.csVal,{color:'#FF5252'}]}>{formatINR(item.current_outstanding)}</Text></View>
                  <View style={{alignItems:'flex-end'}}><Text style={[st.csLabel,{color:colors.textSecondary}]}>Available</Text><Text style={[st.csVal,{color:'#00E676'}]}>{formatINR(avail)}</Text></View>
                </View>
                <View style={[st.usageBar,{backgroundColor:'rgba(255,255,255,0.06)'}]}><View style={[st.usageFill,{width:`${Math.min(usage,100)}%`,backgroundColor:uColor}]}/></View>
                <Text style={[st.usageText,{color:uColor}]}>{usage.toFixed(0)}% utilization</Text>
                {(item.emis||[]).length>0&&<View style={st.emiChip}><Ionicons name="calendar" size={12} color="#FFB300"/><Text style={{color:'#FFB300',fontSize:11,fontWeight:'600'}}>{item.emis.length} EMI · {formatINR(item.emis.reduce((s:number,e:any)=>s+e.amount,0))}/mo</Text></View>}
                <View style={st.cardActions}>
                  <TouchableOpacity style={[st.actBtn,{backgroundColor:'rgba(68,138,255,0.12)'}]} onPress={()=>openEdit(item)}><Ionicons name="create-outline" size={14} color="#448AFF"/><Text style={{color:'#448AFF',fontSize:11,fontWeight:'600'}}>Edit</Text></TouchableOpacity>
                  <TouchableOpacity style={[st.actBtn,{backgroundColor:'rgba(124,77,255,0.12)'}]} onPress={()=>{setEmiCard(item);setShowEmiModal(true)}}><Ionicons name="calculator-outline" size={14} color="#7C4DFF"/><Text style={{color:'#7C4DFF',fontSize:11,fontWeight:'600'}}>Add EMI</Text></TouchableOpacity>
                  <TouchableOpacity style={[st.actBtn,{backgroundColor:'rgba(68,138,255,0.12)'}]} onPress={()=>router.push({pathname:'/reminders',params:{type:'credit_card',related_id:item.card_id,title:`${item.name} Payment`,description:`Credit card payment due`}} as any)}><Ionicons name="notifications-outline" size={14} color="#448AFF"/><Text style={{color:'#448AFF',fontSize:11,fontWeight:'600'}}>Remind</Text></TouchableOpacity>
                  <TouchableOpacity style={[st.actBtn,{backgroundColor:'rgba(255,82,82,0.12)'}]} onPress={()=>handleDelete(item)}><Ionicons name="trash-outline" size={14} color="#FF5252"/><Text style={{color:'#FF5252',fontSize:11,fontWeight:'600'}}>Delete</Text></TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}} ListEmptyComponent={<View style={st.empty}><Ionicons name="card-outline" size={64} color={colors.textSecondary}/><Text style={[st.emptyText,{color:colors.textSecondary}]}>No credit cards</Text></View>}/>
      )}

      {tab==='dues'&&(
        <FlatList data={dues} keyExtractor={(_,i)=>String(i)} contentContainerStyle={st.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary}/>}
          renderItem={({item})=>{const sc=getStatusColor(item.status);return(
            <View style={[st.dueCard,{backgroundColor:colors.card,borderLeftWidth:3,borderLeftColor:sc}]}>
              <View style={st.dueRow}><View style={{flex:1}}><Text style={[st.dueName,{color:colors.text}]}>{item.name}</Text><Text style={[st.dueMeta,{color:colors.textSecondary}]}>Due: {item.due_day}th at {item.due_time} · Next: {item.next_due_date}</Text></View>
              <View style={{alignItems:'flex-end'}}><Text style={[st.dueAmount,{color:sc}]}>{formatINR(item.outstanding)}</Text><Text style={[st.dueDays,{color:sc}]}>{item.days_until<0?`${Math.abs(item.days_until)}d overdue`:item.days_until===0?'Today':`${item.days_until}d left`}</Text></View></View>
            </View>
          )}} ListEmptyComponent={<View style={st.empty}><Text style={[st.emptyText,{color:colors.textSecondary}]}>No due dates</Text></View>}/>
      )}

      {tab==='emis'&&(
        <FlatList data={allEmis} keyExtractor={(_,i)=>String(i)} contentContainerStyle={st.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary}/>}
          renderItem={({item})=>{const pct=item.total_tenure>0?((item.total_tenure-item.tenure_remaining)/item.total_tenure*100):0;return(
            <View style={[st.emiCard,{backgroundColor:colors.card}]}>
              <View style={st.emiTop}><View style={{flex:1}}><Text style={[st.emiName,{color:colors.text}]}>{item.name}</Text><Text style={[st.emiMeta,{color:colors.textSecondary}]}>{item.card_name} · {item.tenure_remaining} months remaining</Text></View>
              <Text style={[st.emiAmount,{color:'#FFB300'}]}>{formatINR(item.amount)}/mo</Text></View>
              <View style={[st.usageBar,{backgroundColor:'rgba(255,255,255,0.06)'}]}><View style={[st.usageFill,{width:`${pct}%`,backgroundColor:'#7C4DFF'}]}/></View>
              <View style={st.emiBtm}><Text style={[{color:colors.textSecondary,fontSize:11}]}>{pct.toFixed(0)}% completed</Text>
              <TouchableOpacity onPress={()=>removeEmi(cards.find((c:any)=>c.card_id===item.card_id),item.emi_idx)}><Ionicons name="trash-outline" size={16} color="#FF5252"/></TouchableOpacity></View>
            </View>
          )}} ListEmptyComponent={<View style={st.empty}><Ionicons name="calculator-outline" size={64} color={colors.textSecondary}/><Text style={[st.emptyText,{color:colors.textSecondary}]}>No EMIs on credit cards</Text></View>}/>
      )}

      {/* Add/Edit Card Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={st.mOverlay}>
          <View style={[st.modal,{backgroundColor:colors.card}]}>
            <View style={st.mHeader}><Text style={[st.mTitle,{color:colors.text}]}>{editItem?'Edit Card':'Add Credit Card'}</Text><TouchableOpacity onPress={()=>{setShowAdd(false);setEditItem(null)}}><Ionicons name="close" size={24} color={colors.text}/></TouchableOpacity></View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={[st.fl,{color:colors.text}]}>Card Name</Text>
              <View style={[st.fi,{borderColor:colors.border,backgroundColor:colors.background}]}><TextInput style={[st.ft,{color:colors.text}]} value={form.name} onChangeText={v=>setForm(p=>({...p,name:v}))} placeholder="e.g. HDFC Regalia" placeholderTextColor={colors.textSecondary}/></View>
              {!editItem&&<><Text style={[st.fl,{color:colors.text}]}>Last 4 Digits</Text><View style={[st.fi,{borderColor:colors.border,backgroundColor:colors.background}]}><TextInput style={[st.ft,{color:colors.text}]} value={form.card_number_last4} onChangeText={v=>setForm(p=>({...p,card_number_last4:v}))} keyboardType="number-pad" maxLength={4} placeholder="4567" placeholderTextColor={colors.textSecondary}/></View></>}
              <Text style={[st.fl,{color:colors.text}]}>Credit Limit</Text>
              <View style={[st.fi,{borderColor:colors.border,backgroundColor:colors.background}]}><Text style={{color:colors.primary,fontSize:18,fontWeight:'bold',marginRight:8}}>{'\u20B9'}</Text><TextInput style={[st.ft,{color:colors.text}]} value={form.credit_limit} onChangeText={v=>setForm(p=>({...p,credit_limit:v}))} keyboardType="decimal-pad" placeholder="200000" placeholderTextColor={colors.textSecondary}/></View>
              <Text style={[st.fl,{color:colors.text}]}>Current Outstanding</Text>
              <View style={[st.fi,{borderColor:colors.border,backgroundColor:colors.background}]}><Text style={{color:'#FF5252',fontSize:18,fontWeight:'bold',marginRight:8}}>{'\u20B9'}</Text><TextInput style={[st.ft,{color:colors.text}]} value={form.current_outstanding} onChangeText={v=>setForm(p=>({...p,current_outstanding:v}))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.textSecondary}/></View>
              {form.credit_limit&&form.current_outstanding?<View style={[st.autoCalc,{backgroundColor:colors.background}]}><Ionicons name="calculator" size={14} color="#00E676"/><Text style={{color:'#00E676',fontSize:13,fontWeight:'600'}}>Available: {formatINR(parseFloat(form.credit_limit||'0')-parseFloat(form.current_outstanding||'0'))}</Text></View>:null}
              <View style={st.rowFields}>
                <View style={{flex:1}}><Text style={[st.fl,{color:colors.text}]}>Billing Date</Text><View style={[st.fi,{borderColor:colors.border,backgroundColor:colors.background}]}><TextInput style={[st.ft,{color:colors.text}]} value={form.billing_date} onChangeText={v=>setForm(p=>({...p,billing_date:v}))} keyboardType="number-pad" maxLength={2}/></View></View>
                <View style={{flex:1}}><Text style={[st.fl,{color:colors.text}]}>Due Date</Text><View style={[st.fi,{borderColor:colors.border,backgroundColor:colors.background}]}><TextInput style={[st.ft,{color:colors.text}]} value={form.due_date} onChangeText={v=>setForm(p=>({...p,due_date:v}))} keyboardType="number-pad" maxLength={2}/></View></View>
                <View style={{flex:1}}><Text style={[st.fl,{color:colors.text}]}>Time</Text><View style={[st.fi,{borderColor:colors.border,backgroundColor:colors.background}]}><TextInput style={[st.ft,{color:colors.text}]} value={form.due_time} onChangeText={v=>setForm(p=>({...p,due_time:v}))} placeholder="10:00"/></View></View>
              </View>
              <Text style={[st.fl,{color:colors.text}]}>Interest Rate %</Text>
              <View style={[st.fi,{borderColor:colors.border,backgroundColor:colors.background}]}><TextInput style={[st.ft,{color:colors.text}]} value={form.interest_rate} onChangeText={v=>setForm(p=>({...p,interest_rate:v}))} keyboardType="decimal-pad" placeholder="42" placeholderTextColor={colors.textSecondary}/></View>
              <TouchableOpacity style={[st.saveBtn,{backgroundColor:colors.primary}]} onPress={handleSave} disabled={saving}>{saving?<ActivityIndicator color="#FFF"/>:<Text style={st.saveBtnText}>{editItem?'Save Changes':'Add Card'}</Text>}</TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* EMI Modal */}
      <Modal visible={showEmiModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={st.mOverlay}>
          <View style={[st.modal,{backgroundColor:colors.card}]}>
            <View style={st.mHeader}><Text style={[st.mTitle,{color:colors.text}]}>Add EMI to {emiCard?.name}</Text><TouchableOpacity onPress={()=>setShowEmiModal(false)}><Ionicons name="close" size={24} color={colors.text}/></TouchableOpacity></View>
            <Text style={[st.fl,{color:colors.text}]}>EMI Name</Text>
            <View style={[st.fi,{borderColor:colors.border,backgroundColor:colors.background}]}><TextInput style={[st.ft,{color:colors.text}]} value={emiForm.name} onChangeText={v=>setEmiForm(p=>({...p,name:v}))} placeholder="e.g. iPhone 16" placeholderTextColor={colors.textSecondary}/></View>
            <Text style={[st.fl,{color:colors.text}]}>Monthly EMI Amount</Text>
            <View style={[st.fi,{borderColor:colors.border,backgroundColor:colors.background}]}><Text style={{color:'#FFB300',fontSize:18,fontWeight:'bold',marginRight:8}}>{'\u20B9'}</Text><TextInput style={[st.ft,{color:colors.text}]} value={emiForm.amount} onChangeText={v=>setEmiForm(p=>({...p,amount:v}))} keyboardType="decimal-pad" placeholder="5000"/></View>
            <View style={st.rowFields}>
              <View style={{flex:1}}><Text style={[st.fl,{color:colors.text}]}>Remaining</Text><View style={[st.fi,{borderColor:colors.border,backgroundColor:colors.background}]}><TextInput style={[st.ft,{color:colors.text}]} value={emiForm.tenure_remaining} onChangeText={v=>setEmiForm(p=>({...p,tenure_remaining:v}))} keyboardType="number-pad" placeholder="9 months"/></View></View>
              <View style={{flex:1}}><Text style={[st.fl,{color:colors.text}]}>Total Tenure</Text><View style={[st.fi,{borderColor:colors.border,backgroundColor:colors.background}]}><TextInput style={[st.ft,{color:colors.text}]} value={emiForm.total_tenure} onChangeText={v=>setEmiForm(p=>({...p,total_tenure:v}))} keyboardType="number-pad" placeholder="12 months"/></View></View>
            </View>
            {emiForm.amount&&emiForm.tenure_remaining?<View style={[st.autoCalc,{backgroundColor:colors.background}]}><Ionicons name="calculator" size={14} color="#FFB300"/><Text style={{color:'#FFB300',fontSize:13,fontWeight:'600'}}>Total Outstanding: {formatINR(parseFloat(emiForm.amount||'0')*parseInt(emiForm.tenure_remaining||'0'))}</Text></View>:null}
            <TouchableOpacity style={[st.saveBtn,{backgroundColor:'#7C4DFF'}]} onPress={addEmi} disabled={saving}>{saving?<ActivityIndicator color="#FFF"/>:<Text style={st.saveBtnText}>Add EMI</Text>}</TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const st=StyleSheet.create({
  center:{flex:1,justifyContent:'center',alignItems:'center'},container:{flex:1},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:20,paddingVertical:16},backBtn:{padding:4},title:{fontSize:20,fontWeight:'bold'},
  summaryCard:{marginHorizontal:20,borderRadius:16,padding:20,marginBottom:14},summaryRow:{flexDirection:'row'},summaryCol:{flex:1,alignItems:'center'},sLabel:{fontSize:11,marginBottom:4},sVal:{fontSize:16,fontWeight:'bold'},
  emiSummary:{flexDirection:'row',alignItems:'center',gap:6,marginTop:12,justifyContent:'center'},
  tabRow:{flexDirection:'row',paddingHorizontal:20,gap:8,marginBottom:10},tabBtn:{flex:1,paddingVertical:10,borderRadius:10,alignItems:'center',borderWidth:1},tabText:{fontSize:13,fontWeight:'500'},
  filterScroll:{maxHeight:44,marginBottom:10},filterChip:{paddingHorizontal:14,paddingVertical:8,borderRadius:20,borderWidth:1},filterText:{fontSize:12,fontWeight:'500'},
  list:{paddingHorizontal:20,paddingBottom:40},
  card:{borderRadius:14,padding:16,marginBottom:10},cardTop:{flexDirection:'row',alignItems:'center',marginBottom:14},cardIcon:{width:42,height:42,borderRadius:21,alignItems:'center',justifyContent:'center',marginRight:12},cardName:{fontSize:16,fontWeight:'600',marginBottom:2},cardMeta:{fontSize:12},
  cardStats:{flexDirection:'row',justifyContent:'space-between',marginBottom:10},csLabel:{fontSize:11,marginBottom:2},csVal:{fontSize:14,fontWeight:'700'},
  usageBar:{height:6,borderRadius:3,overflow:'hidden',marginBottom:6},usageFill:{height:'100%',borderRadius:3},usageText:{fontSize:11,marginBottom:8},
  emiChip:{flexDirection:'row',alignItems:'center',gap:4,marginBottom:10},
  cardActions:{flexDirection:'row',gap:8,flexWrap:'wrap'},actBtn:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:10,paddingVertical:6,borderRadius:8},
  dueCard:{borderRadius:14,padding:16,marginBottom:10},dueRow:{flexDirection:'row',alignItems:'center'},dueName:{fontSize:15,fontWeight:'600'},dueMeta:{fontSize:12,marginTop:2},dueAmount:{fontSize:16,fontWeight:'bold'},dueDays:{fontSize:12,marginTop:2},
  emiCard:{borderRadius:14,padding:16,marginBottom:10},emiTop:{flexDirection:'row',alignItems:'center',marginBottom:10},emiName:{fontSize:15,fontWeight:'600'},emiMeta:{fontSize:12,marginTop:2},emiAmount:{fontSize:16,fontWeight:'bold'},emiBtm:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  empty:{alignItems:'center',paddingVertical:60,gap:8},emptyText:{fontSize:16,fontWeight:'600'},
  mOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'flex-end'},modal:{borderTopLeftRadius:20,borderTopRightRadius:20,padding:20,paddingBottom:40,maxHeight:'90%'},mHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16},mTitle:{fontSize:18,fontWeight:'bold'},
  fl:{fontSize:14,fontWeight:'600',marginBottom:6,marginTop:12},fi:{flexDirection:'row',alignItems:'center',borderWidth:1,borderRadius:10,paddingHorizontal:14,height:46,marginBottom:4},ft:{flex:1,fontSize:15},
  rowFields:{flexDirection:'row',gap:10},autoCalc:{flexDirection:'row',alignItems:'center',gap:6,padding:10,borderRadius:8,marginVertical:8},
  saveBtn:{height:50,borderRadius:12,alignItems:'center',justifyContent:'center',marginTop:16,marginBottom:20},saveBtnText:{color:'#FFF',fontSize:16,fontWeight:'700'},
});

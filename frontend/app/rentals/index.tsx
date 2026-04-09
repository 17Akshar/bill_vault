import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR } from '../../utils/formatINR';

export default function RentalsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [showPayment, setShowPayment] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [form, setForm] = useState({ property_name: '', tenant_name: '', rent_amount: '', due_day: '1', address: '', notes: '' });

  useEffect(() => { load(); }, []);
  const load = async () => { try { const r = await api.get('/rentals'); setRentals(r.data); } catch(e){console.error(e)} finally{setLoading(false);setRefreshing(false)} };
  const onRefresh = useCallback(()=>{setRefreshing(true);load()},[]);

  const openEdit = (r: any) => {
    setEditItem(r); setForm({ property_name:r.property_name, tenant_name:r.tenant_name||'', rent_amount:String(r.rent_amount), due_day:String(r.due_day), address:r.address||'', notes:r.notes||'' }); setShowAdd(true);
  };

  const handleSave = async () => {
    if(!form.property_name.trim()){Alert.alert('Required','Enter property name');return}
    if(!form.rent_amount||parseFloat(form.rent_amount)<=0){Alert.alert('Required','Enter rent amount');return}
    setSaving(true);
    try {
      const payload = { property_name:form.property_name.trim(), tenant_name:form.tenant_name.trim(), rent_amount:parseFloat(form.rent_amount), due_day:parseInt(form.due_day)||1, address:form.address.trim(), notes:form.notes.trim() };
      if(editItem) await api.put(`/rentals/${editItem.rental_id}`, payload);
      else await api.post('/rentals', payload);
      setShowAdd(false); setEditItem(null); setForm({property_name:'',tenant_name:'',rent_amount:'',due_day:'1',address:'',notes:''}); load();
    } catch(e:any){Alert.alert('Error',e.response?.data?.detail||'Failed')} finally{setSaving(false)}
  };

  const recordPayment = async () => {
    if(!paymentAmount||parseFloat(paymentAmount)<=0){Alert.alert('Required','Enter payment amount');return}
    setSaving(true);
    try {
      await api.post(`/rentals/${showPayment.rental_id}/payments`, { rental_id:showPayment.rental_id, amount:parseFloat(paymentAmount), payment_date:new Date().toISOString() });
      setShowPayment(null); setPaymentAmount(''); load();
    } catch{Alert.alert('Error','Failed')} finally{setSaving(false)}
  };

  const handleDelete = (r: any) => Alert.alert('Delete',`Remove ${r.property_name}?`,[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:async()=>{try{await api.delete(`/rentals/${r.rental_id}`);load()}catch{Alert.alert('Error','Failed')}}}]);

  const totalMonthly = rentals.reduce((s,r)=>s+r.rent_amount,0);
  const totalCollected = rentals.reduce((s,r)=>s+(r.total_collected||0),0);
  const paidCount = rentals.filter(r=>r.current_month_paid).length;

  if(loading) return <View style={[st.center,{backgroundColor:colors.background}]}><ActivityIndicator size="large" color={colors.primary}/></View>;

  return (
    <SafeAreaView style={[st.container,{backgroundColor:colors.background}]}>
      <View style={st.header}>
        <TouchableOpacity onPress={()=>router.back()} style={st.backBtn}><Ionicons name="arrow-back" size={24} color={colors.text}/></TouchableOpacity>
        <Text style={[st.title,{color:colors.text}]}>Rental Income</Text>
        <TouchableOpacity onPress={()=>{setEditItem(null);setForm({property_name:'',tenant_name:'',rent_amount:'',due_day:'1',address:'',notes:''});setShowAdd(true)}}><Ionicons name="add-circle" size={28} color={colors.primary}/></TouchableOpacity>
      </View>

      <View style={[st.summaryCard,{backgroundColor:colors.card}]}>
        <View style={st.summaryRow}>
          <View style={st.summaryCol}><Text style={[st.sLabel,{color:colors.textSecondary}]}>Monthly Rent</Text><Text style={[st.sVal,{color:colors.text}]}>{formatINR(totalMonthly)}</Text></View>
          <View style={st.summaryCol}><Text style={[st.sLabel,{color:colors.textSecondary}]}>Total Collected</Text><Text style={[st.sVal,{color:'#00E676'}]}>{formatINR(totalCollected)}</Text></View>
          <View style={st.summaryCol}><Text style={[st.sLabel,{color:colors.textSecondary}]}>This Month</Text><Text style={[st.sVal,{color:paidCount===rentals.length?'#00E676':'#FFB300'}]}>{paidCount}/{rentals.length} Paid</Text></View>
        </View>
      </View>

      <FlatList data={rentals} keyExtractor={i=>i.rental_id} contentContainerStyle={st.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary}/>}
        renderItem={({item})=>{
          const paid=item.current_month_paid;
          return(
            <TouchableOpacity style={[st.card,{backgroundColor:colors.card,borderLeftWidth:3,borderLeftColor:paid?'#00E676':'#FFB300'}]} onPress={()=>openEdit(item)} activeOpacity={0.7}>
              <View style={st.cardTop}>
                <View style={[st.cardIcon,{backgroundColor:paid?'rgba(0,230,118,0.12)':'rgba(255,179,0,0.12)'}]}><Ionicons name="home" size={20} color={paid?'#00E676':'#FFB300'}/></View>
                <View style={{flex:1}}><Text style={[st.cardName,{color:colors.text}]}>{item.property_name}</Text><Text style={[st.cardMeta,{color:colors.textSecondary}]}>{item.tenant_name?`Tenant: ${item.tenant_name} · `:''}Due: {item.due_day}th</Text>{item.address?<Text style={[st.cardMeta,{color:colors.textSecondary}]}>{item.address}</Text>:null}</View>
                <View style={{alignItems:'flex-end'}}><Text style={[st.cardAmount,{color:colors.text}]}>{formatINR(item.rent_amount)}</Text><Text style={[st.cardStatus,{color:paid?'#00E676':'#FFB300'}]}>{paid?'Paid':'Pending'}</Text></View>
              </View>
              <View style={st.cardActions}>
                {!paid&&<TouchableOpacity style={[st.actBtn,{backgroundColor:'rgba(0,230,118,0.12)'}]} onPress={()=>{setShowPayment(item);setPaymentAmount(String(item.rent_amount))}}><Ionicons name="checkmark-circle" size={14} color="#00E676"/><Text style={{color:'#00E676',fontSize:11,fontWeight:'600'}}>Record Payment</Text></TouchableOpacity>}
                <TouchableOpacity style={[st.actBtn,{backgroundColor:'rgba(68,138,255,0.12)'}]} onPress={()=>router.push({pathname:'/reminders',params:{type:'custom',title:`Rent: ${item.property_name}`,description:`Collect rent from ${item.tenant_name||'tenant'}`}} as any)}><Ionicons name="notifications-outline" size={14} color="#448AFF"/><Text style={{color:'#448AFF',fontSize:11,fontWeight:'600'}}>Remind</Text></TouchableOpacity>
                <TouchableOpacity style={[st.actBtn,{backgroundColor:'rgba(68,138,255,0.12)'}]} onPress={()=>openEdit(item)}><Ionicons name="create-outline" size={14} color="#448AFF"/><Text style={{color:'#448AFF',fontSize:11,fontWeight:'600'}}>Edit</Text></TouchableOpacity>
                <TouchableOpacity style={[st.actBtn,{backgroundColor:'rgba(255,82,82,0.12)'}]} onPress={()=>handleDelete(item)}><Ionicons name="trash-outline" size={14} color="#FF5252"/><Text style={{color:'#FF5252',fontSize:11,fontWeight:'600'}}>Delete</Text></TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}} ListEmptyComponent={<View style={st.empty}><Ionicons name="home-outline" size={64} color={colors.textSecondary}/><Text style={[st.emptyText,{color:colors.textSecondary}]}>No rental properties</Text><Text style={[{color:colors.textSecondary,fontSize:13}]}>Track your rental income and tenant payments</Text></View>}/>

      {/* Add/Edit Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={st.mOverlay}>
          <View style={[st.modal,{backgroundColor:colors.card}]}>
            <View style={st.mHeader}><Text style={[st.mTitle,{color:colors.text}]}>{editItem?'Edit Property':'Add Rental Property'}</Text><TouchableOpacity onPress={()=>{setShowAdd(false);setEditItem(null)}}><Ionicons name="close" size={24} color={colors.text}/></TouchableOpacity></View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[st.fl,{color:colors.text}]}>Property Name</Text>
              <View style={[st.fi,{borderColor:colors.border,backgroundColor:colors.background}]}><TextInput style={[st.ft,{color:colors.text}]} value={form.property_name} onChangeText={v=>setForm(p=>({...p,property_name:v}))} placeholder="e.g. Flat 302, Green Towers" placeholderTextColor={colors.textSecondary}/></View>
              <Text style={[st.fl,{color:colors.text}]}>Tenant Name</Text>
              <View style={[st.fi,{borderColor:colors.border,backgroundColor:colors.background}]}><TextInput style={[st.ft,{color:colors.text}]} value={form.tenant_name} onChangeText={v=>setForm(p=>({...p,tenant_name:v}))} placeholder="Tenant name" placeholderTextColor={colors.textSecondary}/></View>
              <Text style={[st.fl,{color:colors.text}]}>Monthly Rent</Text>
              <View style={[st.fi,{borderColor:colors.border,backgroundColor:colors.background}]}><Text style={{color:'#00E676',fontSize:18,fontWeight:'bold',marginRight:8}}>{'\u20B9'}</Text><TextInput style={[st.ft,{color:colors.text}]} value={form.rent_amount} onChangeText={v=>setForm(p=>({...p,rent_amount:v}))} keyboardType="decimal-pad" placeholder="15000"/></View>
              <Text style={[st.fl,{color:colors.text}]}>Due Day of Month</Text>
              <View style={[st.fi,{borderColor:colors.border,backgroundColor:colors.background}]}><TextInput style={[st.ft,{color:colors.text}]} value={form.due_day} onChangeText={v=>setForm(p=>({...p,due_day:v}))} keyboardType="number-pad" maxLength={2}/></View>
              <Text style={[st.fl,{color:colors.text}]}>Address</Text>
              <View style={[st.fi,{borderColor:colors.border,backgroundColor:colors.background,height:60,alignItems:'flex-start',paddingTop:10}]}><TextInput style={[st.ft,{color:colors.text}]} value={form.address} onChangeText={v=>setForm(p=>({...p,address:v}))} multiline placeholder="Optional address" placeholderTextColor={colors.textSecondary}/></View>
              <TouchableOpacity style={[st.saveBtn,{backgroundColor:colors.primary}]} onPress={handleSave} disabled={saving}>{saving?<ActivityIndicator color="#FFF"/>:<Text style={st.saveBtnText}>{editItem?'Save Changes':'Add Property'}</Text>}</TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Record Payment Modal */}
      <Modal visible={!!showPayment} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={st.mOverlay}>
          <View style={[st.modal,{backgroundColor:colors.card}]}>
            <View style={st.mHeader}><Text style={[st.mTitle,{color:colors.text}]}>Record Payment</Text><TouchableOpacity onPress={()=>setShowPayment(null)}><Ionicons name="close" size={24} color={colors.text}/></TouchableOpacity></View>
            <Text style={[st.fl,{color:colors.text}]}>Amount Received</Text>
            <View style={[st.fi,{borderColor:colors.border,backgroundColor:colors.background}]}><Text style={{color:'#00E676',fontSize:18,fontWeight:'bold',marginRight:8}}>{'\u20B9'}</Text><TextInput style={[st.ft,{color:colors.text}]} value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="decimal-pad"/></View>
            <TouchableOpacity style={[st.saveBtn,{backgroundColor:'#00E676'}]} onPress={recordPayment} disabled={saving}>{saving?<ActivityIndicator color="#000"/>:<Text style={[st.saveBtnText,{color:'#000'}]}>Record Payment</Text>}</TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const st=StyleSheet.create({
  center:{flex:1,justifyContent:'center',alignItems:'center'},container:{flex:1},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:20,paddingVertical:16},backBtn:{padding:4},title:{fontSize:20,fontWeight:'bold'},
  summaryCard:{marginHorizontal:20,borderRadius:16,padding:20,marginBottom:14},summaryRow:{flexDirection:'row'},summaryCol:{flex:1,alignItems:'center'},sLabel:{fontSize:11,marginBottom:4},sVal:{fontSize:15,fontWeight:'bold'},
  list:{paddingHorizontal:20,paddingBottom:40},
  card:{borderRadius:14,padding:16,marginBottom:10},cardTop:{flexDirection:'row',alignItems:'flex-start',marginBottom:12},cardIcon:{width:42,height:42,borderRadius:21,alignItems:'center',justifyContent:'center',marginRight:12,marginTop:2},cardName:{fontSize:16,fontWeight:'600',marginBottom:3},cardMeta:{fontSize:12},cardAmount:{fontSize:17,fontWeight:'bold'},cardStatus:{fontSize:12,fontWeight:'600',marginTop:2},
  cardActions:{flexDirection:'row',gap:8,flexWrap:'wrap'},actBtn:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:10,paddingVertical:6,borderRadius:8},
  empty:{alignItems:'center',paddingVertical:60,gap:8},emptyText:{fontSize:16,fontWeight:'600'},
  mOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'flex-end'},modal:{borderTopLeftRadius:20,borderTopRightRadius:20,padding:20,paddingBottom:40,maxHeight:'85%'},mHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16},mTitle:{fontSize:18,fontWeight:'bold'},
  fl:{fontSize:14,fontWeight:'600',marginBottom:6,marginTop:12},fi:{flexDirection:'row',alignItems:'center',borderWidth:1,borderRadius:10,paddingHorizontal:14,height:46,marginBottom:4},ft:{flex:1,fontSize:15},
  saveBtn:{height:50,borderRadius:12,alignItems:'center',justifyContent:'center',marginTop:16,marginBottom:20},saveBtnText:{color:'#FFF',fontSize:16,fontWeight:'700'},
});

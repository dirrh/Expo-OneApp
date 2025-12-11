import { View, Text, StyleSheet, Image } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { users } from '../lib/data/users';


export default function HomeScreen() {
  return (
    <View style={styles.container}>

        <View style={styles.container_items}>
        <Image source={require('../images/photo.png')} style={styles.image} />         
         <Text style={styles.container_text_top}>{users[0].first_name} {users[0].last_name}</Text>
          <Text style={styles.container_text_bottom}>ID: {users[0].id} </Text>
        </View> 
      
        <View style={styles.container_qr}>
        <QRCode
          value="Skuska"
          size={325}
          backgroundColor="white"
          color="black"
          logoBorderRadius={5}
        />
        </View>

    </View>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor:'#FFFFFF'
  },
  image: {
    width: 120,
    height: 160,
    borderRadius: 5, 
    margin: 15,
  },
  container_items:{
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignContent:'center'
    },
  container_text_top:{
    textAlign:'center',
    margin:2,
    fontWeight:'900',
    fontSize:22,
    fontFamily:'Inter'
  },
  container_text_bottom:{
    textAlign:'center',
    marginBottom:25,
    color:'gray',
    fontWeight:'bold',
    fontSize:18,
    fontFamily:'Inter'
  },
  container_qr:{
    backgroundColor:'#FFFFFF',
    borderRadius:20,
    padding:25,
    elevation:5,
  
  },
});
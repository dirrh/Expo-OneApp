import { useNavigation } from "@react-navigation/native";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native";
import { Image } from "react-native";


export default function BusinessDetail(){

    const navigation = useNavigation<any>();
    
    
    return(

        <SafeAreaView style={styles.main}>


        <View>

        <Image style={styles.main_image} source={require("../images/fitness_bg.png")}></Image>

        <Text style={{position:"absolute", bottom:40,fontSize:25,fontWeight:"bold",color:"white",left:15}}>Red Royal Gym</Text>
        
        <Text style={{position:"absolute", bottom:40,fontSize:15,fontWeight:"bold",color:"white",left:205}}>Fitness</Text>
        
        
        <Text style={{position:"absolute",bottom:20,left:15,color:"white",}}>4.6(10)</Text>
        <Text style={{position:"absolute",bottom:20,left:70,color:"white",}}>1.7 km</Text>
        <Text style={{position:"absolute",bottom:20,left:125,color:"white",}}>9:00 – 21:00</Text>
        </View>


        <Text>sad</Text>
        <Text>Sad</Text>
        
        
        
        
        
        
        </SafeAreaView>
    )


};

export const styles = StyleSheet.create({

    main:{
        flex:1,
        flexDirection:"column",
    },
    main_image:{
        width:"100%",
    },
})
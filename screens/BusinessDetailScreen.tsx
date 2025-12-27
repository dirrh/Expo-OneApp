import React, { useMemo, useRef, useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { FlatList, Image, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { TouchableOpacity } from "react-native-gesture-handler";
import BottomSheet from "@gorhom/bottom-sheet";


export default function BusinessDetailScreen(){

    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const branch = route.params?.branch;
    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const [index, setIndex] = useState(0);
    const [active,setActive] = useState<string>("News");
    const logRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ["15%", "35%"], []);

    const menu =["News","Benefits","Info","Reviews"];
    const heroHeight = Math.min(360, Math.max(240, Math.round(width * 0.7)));
    const sidePadding = 15;
    const menuTop = heroHeight + 10;
    const sectionTop = menuTop + 70;
    const menuItemWidth = Math.min(
        88,
        Math.floor((width - sidePadding * 2 - 4 - menu.length * 5) / menu.length)
    );
    const safeBranch = branch ?? {
        title: "",
        rating: "",
        distance: "",
        hours: "",
    };

    const data = [
    { id: "1", title: "365 GYM", image: require("../assets/365.jpg") },
    { id: "2", title: "RED ROYAL", image: require("../assets/royal.jpg") },
    { id: "3", title: "Default", image: require("../images/fitness_bg.png") },
    ];

    return(

        <SafeAreaView style={styles.main} edges={["left", "right", "bottom"]}>

        <View style={[styles.hero, { height: heroHeight }]}>

    <FlatList
        data={data}
        keyExtractor={(item)=> item.id}
        horizontal={true}
        pagingEnabled={true}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
            const nextIndex = Math.round(e.nativeEvent.contentOffset.x / width);
            setIndex(nextIndex);
        }}
        renderItem={({item}) => (
            <View style={{ width, height: heroHeight }}>
                <Image source={item.image} style={styles.heroImage} />
            </View>
        )}>

        </FlatList>
        <View style={[styles.pagination, { bottom: 10 }]}>
            {data.map((_, i) => (
                <View
                    key={String(i)}
                    style={[styles.dot, i === index ? styles.dotActive : styles.dotInactive]}
                />
            ))}
        </View>

        <View style={[styles.topLeft, { top: insets.top + 10 }]}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Image source={require("../images/arrow.png")} />
            </TouchableOpacity>
        </View>

        <View style={[styles.topRight, { top: insets.top + 8 }]}>
            <TouchableOpacity style={styles.actionBtn}>
                <Image source={require("../images/button_like.png")} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
                <Image source={require("../images/button_bell.png")} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnLast}>
                <Image source={require("../images/button_share.png")} />
            </TouchableOpacity>
        </View>

        <View style={styles.infoOverlay}>
            <View style={styles.titleRow}>
                <Text style={styles.title}>{safeBranch.title}</Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>Fitness</Text>
                </View>
            </View>
            <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                    <Image source={require("../images/star.png")} style={styles.metaIcon} />
                    <Text style={styles.metaText}>{safeBranch.rating}</Text>
                </View>
                <View style={styles.metaItem}>
                    <Image source={require("../images/pin_white.png")} style={styles.metaIcon} />
                    <Text style={styles.metaText}>{safeBranch.distance}</Text>
                </View>
                <View style={styles.metaItemLast}>
                    <Image source={require("../images/clock.png")} style={styles.metaIcon} />
                    <Text style={styles.metaText}>{safeBranch.hours}</Text>
                </View>
            </View>
        </View>

        </View>

      
        <View style={{flexDirection:"row",position:"absolute",left:sidePadding,right:sidePadding,top:menuTop,height:52,borderRadius:35,backgroundColor:"#FFFFFF",borderWidth: 1,borderColor:"#E4E4E7",paddingLeft:2,paddingRight:2}}>

            {menu.map((x) => (
                <View key={x} style={{marginLeft:5}}>
                    <TouchableOpacity style={{justifyContent:"center",backgroundColor: active === x ? "orange":"white",padding:5, borderRadius:25,height:37,marginTop:7,width:menuItemWidth,}}>
                        <Text style={{textAlign:"center"}} onPress={()=>setActive(x)}>{x}</Text>
                    </TouchableOpacity>
                </View>
            ))}

        </View>

        {active === "News"&& (<View style={{position:"absolute", top:sectionTop,left:sidePadding,right:sidePadding}}>

            <View style={{flexDirection:"row"}}>
                <Image source={require("../images/placeholder_pfp.png")}></Image>
                <Text style={{position:"absolute", left:55,right:36,top:12,fontWeight:"bold"}}>{safeBranch.title}</Text>
                <Image style={{position:"absolute",right:0,top:12}} source={require("../images/dots.png")}></Image>
            </View>

            <View style={{position:"absolute",top:50,width:"100%"}}>
                <Image style={{width:"100%",borderRadius:15}} source={require("../images/post_picture.png")}></Image>

                <View style={{flexDirection:"row", marginTop:10}}>
                    <Image source={require("../images/heart.png")}></Image>
                    <Text style={{marginLeft:5,marginRight:5,fontWeight:"bold"}}>28</Text>

                    <Image source={require("../images/comment.png")}></Image>
                    <Text style={{marginLeft:5,marginRight:5,fontWeight:"bold"}}>3</Text>
                </View>

                <View style={{}}>
                    <Text style={{textAlign:"justify"}}>
                <Text style={{ fontWeight: "700",textAlign:"justify" }}>{safeBranch.title} </Text>
                🔥New flavors of protein shakes! Come workout and buy one and get the second one for free
                </Text>
                </View>
            </View>

        </View>
        )}

        {active ==="Benefits"&&(
            <View style={{position:"absolute", top:sectionTop,left:sidePadding,right:sidePadding}}>
                <View style={{flexDirection:"column",borderRadius:15, backgroundColor:"white",borderWidth:1,padding:20,borderColor:"#E4E4E7"}}>
                    <Text style={{marginBottom:10, fontSize:15,fontWeight:"bold"}}>20% discount on first entry</Text>
                    <Text style={{marginBottom:10, fontSize:12}}>Get 20% off your first visit to the fitness center and save on your first workout.</Text>
                    <TouchableOpacity style={{width:"100%",backgroundColor:"#E4E4E7",padding:10, borderRadius:15}}><Text style={{textAlign:"center"}}>Activated</Text></TouchableOpacity>
                </View>

                <View style={{flexDirection:"column",borderRadius:15, backgroundColor:"white",borderWidth:1,padding:20,borderColor:"#E4E4E7",marginTop:15}}>
                    <Text style={{marginBottom:10, fontSize:15,fontWeight:"bold"}}>1 + 1 protein shake</Text>
                    <Text style={{marginBottom:10, fontSize:12}}>Buy one protein shake and get a second one for free after your workout.</Text>
                    <TouchableOpacity style={{width:"100%",backgroundColor:"orange",padding:10, borderRadius:15}} onPress={()=> logRef.current?.expand()}><Text style={{textAlign:"center"}}>Active Benefit</Text></TouchableOpacity>
                </View>

            </View>

          
        )}

        {active === "Benefits" && (
            <BottomSheet
                ref={logRef}
                index={-1}
                snapPoints={snapPoints}
                enablePanDownToClose
            >
                <View style={{flex:1,alignItems:"stretch",width:"100%",paddingHorizontal:20}}>
                    <Image source={require("../images/diamond.png")} style={{alignSelf:"center"}}></Image>
                    <Text style={{fontSize:24,fontWeight:"bold",textAlign:"center",marginTop:8}}>
                        Sign in to activate this benefit
                    </Text>
                    <Text style={{fontSize:15,textAlign:"center",marginTop:6}}>
                        You need an account to redeem and track your benefits
                    </Text>
                    <TouchableOpacity onPress={()=> navigation.navigate("Login")} style={{backgroundColor:"black",width:"100%",paddingVertical:12,borderRadius:10,marginTop:16}}>
                        <Text style={{color:"white",textAlign:"center",fontWeight:"600"}}>Sign in</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={()=>logRef.current?.close()} style={{marginTop:10}}>
                        <Text style={{textAlign:"center"}}>No thanks</Text>
                    </TouchableOpacity>
                </View>
            </BottomSheet>
        )}
        
       

        
        
        
        
        
        
        </SafeAreaView>
    )


};

export const styles = StyleSheet.create({

    main:{
        flex:1,
        flexDirection:"column",
        backgroundColor:"#FFFFFF"
    },
    hero: {
        width: "100%",
        backgroundColor: "#000",
    },
    heroImage: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    pagination: {
        position: "absolute",
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "center",
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginHorizontal: 3,
    },
    dotActive: {
        backgroundColor: "#fff",
    },
    dotInactive: {
        backgroundColor: "rgba(255,255,255,0.4)",
    },
    topLeft: {
        position: "absolute",
        left: 12,
    },
    topRight: {
        position: "absolute",
        right: 12,
    },
    actionBtn: {
        backgroundColor: "#fff",
        borderRadius: 18,
        padding: 6,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    actionBtnLast: {
        backgroundColor: "#fff",
        borderRadius: 18,
        padding: 6,
        alignItems: "center",
        justifyContent: "center",
    },
    infoOverlay: {
        position: "absolute",
        left: 14,
        right: 70,
        bottom: 26,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
    },
    title: {
        color: "#fff",
        fontSize: 22,
        fontWeight: "700",
        textShadowColor: "rgba(0,0,0,0.4)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    badge: {
        backgroundColor: "#EB8100",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 10,
    },
    badgeText: {
        color: "#fff",
        fontSize: 10,
        fontWeight: "700",
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
    },
    metaItem: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: 14,
    },
    metaItemLast: {
        flexDirection: "row",
        alignItems: "center",
    },
    metaIcon: {
        width: 12,
        height: 12,
    },
    metaText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
        textShadowColor: "rgba(0,0,0,0.4)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
})

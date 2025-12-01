import {ActivityIndicator, Text, View, StyleSheet, Image} from "react-native";

const Navbar = () => {
    const navbarStyles = StyleSheet.create({
        container: {
            flexDirection:"row",
            justifyContent:"space-around",
            alignItems:"center",
            height: 50,
        },
        navbarItem: {
            
        }
        
    })
    const sections = [
        {
            name: "Home",
            imgSrc: require("../../assets/images/house.png"),
            image: <Image source={require("../../assets/images/house.svg")} />
        }, 
        {
            name: "Events"
        }, 
        {
            name: "Sensors"
        }, 
        {
            name: "Settings"
        }]
    return (
        <View style={navbarStyles.container}>
            
            {
                sections.map((section, index) =>
                    <View key={section.name} style={navbarStyles.navbarItem}>
                        <Image source={section.imgSrc}/>
                        <Text>{section.name}</Text>
                    </View>)
            }
        </View>

    )
}

export default Navbar;



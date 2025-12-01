import {ActivityIndicator, Text, View} from "react-native";
import Navbar from "../components/navbar/navbar"
export default function Index() {
  return (
    <View
      style={{
          display:"flex",
          flexDirection:"column",
          
        // flex: 1,
        // justifyContent: "center",
        // alignItems: "center",
      }}
    >
        {/*<ActivityIndicator />*/}
        
        
        <Text>Smart Doorlock Mobile App</Text>
        <Navbar />
    </View>
  );
}

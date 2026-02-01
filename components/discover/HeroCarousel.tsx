import React, { useCallback } from "react";
import { FlatList, Image, Platform, View } from "react-native";

type Props = {
  data: any[];
  height: number;
  width: number;
  index: number;
  onIndexChange: (i: number) => void;
};

export function HeroCarousel({ data, height, width, index, onIndexChange }: Props) {
  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <View style={{ width, height }}>
        <Image source={item.image} style={{ width: "100%", height: "100%" }} />
      </View>
    ),
    [height, width]
  );

  const getItemLayout = useCallback(
    (_: any, i: number) => ({
      length: width,
      offset: width * i,
      index: i,
    }),
    [width]
  );

  return (
    <>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const nextIndex = Math.round(e.nativeEvent.contentOffset.x / width);
          onIndexChange(nextIndex);
        }}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={3}
        removeClippedSubviews={Platform.OS !== "web"}
      />

      <View style={{ position: "absolute", bottom: 10, flexDirection: "row", alignSelf: "center" }}>
        {data.map((_, i) => (
          <View
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              marginHorizontal: 3,
              backgroundColor: i === index ? "#fff" : "rgba(255,255,255,0.4)",
            }}
          />
        ))}
      </View>
    </>
  );
}

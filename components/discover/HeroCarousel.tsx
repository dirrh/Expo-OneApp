import React, { useCallback } from "react";
import { FlatList, Image, Platform, StyleSheet, View } from "react-native";

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
        <Image
          source={item.image}
          style={carouselStyles.image}
          resizeMode="cover"
          resizeMethod="resize"
          fadeDuration={0}
        />
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

  const showDots = data.length > 1;

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

      {showDots && (
        <View style={carouselStyles.dotsWrapper}>
          <View style={carouselStyles.dotsContainer}>
            {data.map((_, i) => (
              <View
                key={i}
                style={[
                  carouselStyles.dot,
                  i === index ? carouselStyles.dotActive : carouselStyles.dotInactive,
                ]}
              />
            ))}
          </View>
        </View>
      )}
    </>
  );
}

const carouselStyles = StyleSheet.create({
  image: {
    width: "100%",
    height: "100%",
  },
  dotsWrapper: {
    position: "absolute",
    bottom: 4,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginHorizontal: 3,
  },
  dotActive: {
    backgroundColor: "#fff",
    transform: [{ scale: 1.15 }],
  },
  dotInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.45)",
  },
});

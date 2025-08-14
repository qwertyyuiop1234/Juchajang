import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../constants/Styles";

interface GuideStep {
  type: number;
  instructions: string;
  distance: number;
  duration: number;
  pointIndex: number;
}

interface TurnByTurnGuideProps {
  currentStep?: GuideStep;
  nextStep?: GuideStep;
  remainingDistance: number;
}

export const TurnByTurnGuide: React.FC<TurnByTurnGuideProps> = ({
  currentStep,
  nextStep,
  remainingDistance,
}) => {
  const getDirectionIcon = (type: number) => {
    switch (type) {
      case 1: // 직진
        return "arrow-up";
      case 2: // 좌회전
        return "arrow-back";
      case 3: // 우회전
        return "arrow-forward";
      case 4: // U턴
        return "return-up-back";
      case 12: // 왼쪽 방향
        return "arrow-back";
      case 13: // 오른쪽 방향
        return "arrow-forward";
      case 14: // 왼쪽 진입
        return "arrow-back";
      case 15: // 오른쪽 진입
        return "arrow-forward";
      case 88: // 목적지 도착
        return "flag";
      default:
        return "arrow-up";
    }
  };

  const getDirectionText = (type: number) => {
    switch (type) {
      case 1:
        return "직진";
      case 2:
        return "좌회전";
      case 3:
        return "우회전";
      case 4:
        return "U턴";
      case 12:
        return "왼쪽 방향";
      case 13:
        return "오른쪽 방향";
      case 14:
        return "왼쪽으로 진입";
      case 15:
        return "오른쪽으로 진입";
      case 88:
        return "목적지 도착";
      default:
        return "계속 진행";
    }
  };

  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)}km`;
    }
    return `${Math.round(meters)}m`;
  };

  return (
    <View style={styles.container}>
      {currentStep && (
        <View style={styles.currentStepContainer}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={getDirectionIcon(currentStep.type) as any}
              size={40}
              color={Colors.white}
            />
          </View>
          <View style={styles.instructionContainer}>
            <Text style={styles.distanceText}>
              {formatDistance(remainingDistance)} 후
            </Text>
            <Text style={styles.instructionText}>
              {getDirectionText(currentStep.type)}
            </Text>
            {currentStep.instructions && (
              <Text style={styles.detailText}>
                {currentStep.instructions}
              </Text>
            )}
          </View>
        </View>
      )}

      {nextStep && (
        <View style={styles.nextStepContainer}>
          <Ionicons
            name={getDirectionIcon(nextStep.type) as any}
            size={16}
            color={Colors.gray400}
          />
          <Text style={styles.nextStepText}>
            {formatDistance(nextStep.distance)} 후 {getDirectionText(nextStep.type)}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(0, 122, 255, 0.95)",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    marginHorizontal: Spacing.base,
  },
  currentStepContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.base,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  instructionContainer: {
    flex: 1,
  },
  distanceText: {
    color: Colors.white,
    fontSize: Typography.sm,
    opacity: 0.9,
  },
  instructionText: {
    color: Colors.white,
    fontSize: Typography.xl,
    fontWeight: "700",
    marginVertical: Spacing.xs,
  },
  detailText: {
    color: Colors.white,
    fontSize: Typography.sm,
    opacity: 0.8,
  },
  nextStepContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.2)",
  },
  nextStepText: {
    color: Colors.white,
    fontSize: Typography.sm,
    opacity: 0.7,
  },
});

export default TurnByTurnGuide;
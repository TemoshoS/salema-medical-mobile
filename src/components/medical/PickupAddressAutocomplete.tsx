import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

export type SelectedPickup = {
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  placeId: string;
};

type Suggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  onSelect: (place: SelectedPickup | null) => void;
  placeholder?: string;
  disabled?: boolean;
};

export default function PickupAddressAutocomplete({
  value,
  onChangeText,
  onSelect,
  placeholder = "Search street, suburb or landmark",
  disabled = false,
}: Props) {
  const { token } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const requestNumber = useRef(0);
  const selectedAddressRef = useRef<string | null>(null);

  useEffect(() => {
    const input = value.trim();
    const currentRequest = ++requestNumber.current;

    setSearchError("");

    // A selected place must not trigger another autocomplete search.
    if (selectedAddressRef.current === input) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      setDropdownOpen(false);
      return;
    }

    if (input.length < 3 || !token || disabled) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      setDropdownOpen(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoadingSuggestions(true);

      try {
        const response = await fetch(
          `${API_BASE_URL}/places/autocomplete`,
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ input }),
          },
        );

        const data = await response.json();

        if (currentRequest !== requestNumber.current) return;

        if (!response.ok || data.success !== true) {
          throw new Error(
            data.message || "Address suggestions are unavailable.",
          );
        }

        setSuggestions(
          Array.isArray(data.suggestions) ? data.suggestions : [],
        );
        setDropdownOpen(true);
      } catch (error) {
        if (currentRequest !== requestNumber.current) return;

        setSuggestions([]);
        setSearchError(
          error instanceof Error
            ? error.message
            : "Unable to search addresses.",
        );
        setDropdownOpen(true);
      } finally {
        if (currentRequest === requestNumber.current) {
          setLoadingSuggestions(false);
        }
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [value, token, disabled]);

  const selectSuggestion = async (suggestion: Suggestion) => {
    if (!token || loadingDetails || disabled) return;

    // Prevent a pending search from replacing the selected results.
    requestNumber.current += 1;
    setLoadingSuggestions(false);
    setLoadingDetails(true);
    setSearchError("");
    setDropdownOpen(false);
    setSuggestions([]);

    try {
      const response = await fetch(
        `${API_BASE_URL}/places/details/${encodeURIComponent(suggestion.placeId)}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok || data.success !== true || !data.place?.location) {
        throw new Error(
          data.message || "Could not get the selected address coordinates.",
        );
      }

      const latitude = data.place.location.latitude;
      const longitude = data.place.location.longitude;
      const address = data.place.address || suggestion.description;

      if (
        typeof latitude !== "number" ||
        typeof longitude !== "number" ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        throw new Error("Google did not return valid coordinates.");
      }

      // Remember the selection before updating the parent input.
      // This prevents the updated value from reopening autocomplete.
      selectedAddressRef.current = address;
      setSuggestions([]);
      setDropdownOpen(false);

      onChangeText(address);
      onSelect({
        address,
        location: { latitude, longitude },
        placeId: data.place.placeId || suggestion.placeId,
      });
    } catch (error) {
      setSearchError(
        error instanceof Error
          ? error.message
          : "Unable to retrieve this address.",
      );
      setDropdownOpen(true);
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrap}>
        <Ionicons name="search-outline" size={20} color="#626782" />
        <TextInput
          value={value}
          onChangeText={(text) => {
            if (selectedAddressRef.current !== text.trim()) {
            selectedAddressRef.current = null;
          }
            onChangeText(text);
            onSelect(null);
            setSuggestions([]);
            setDropdownOpen(text.trim().length >= 3);
          }}
          onFocus={() => {
            const input = value.trim();
            if (
              input.length >= 3 &&
              input !== selectedAddressRef.current
            ) {
              setDropdownOpen(true);
            }
          }}
          placeholder={placeholder}
          placeholderTextColor="#9290A5"
          style={styles.input}
          accessibilityLabel="Pickup address search"
          editable={!disabled && !loadingDetails}
          autoCorrect={false}
          returnKeyType="search"
        />
        {loadingSuggestions || loadingDetails ? (
          <ActivityIndicator size="small" color="#461477" />
        ) : value.length > 0 ? (
          <Pressable
            onPress={() => {
              selectedAddressRef.current = null;
              onChangeText("");
              onSelect(null);
              setSuggestions([]);
              setSearchError("");
              setDropdownOpen(false);
            }}
            accessibilityRole="button"
            accessibilityLabel="Clear pickup address"
          >
            <Ionicons name="close-circle" size={20} color="#626782" />
          </Pressable>
        ) : null}
      </View>

      {dropdownOpen && value.trim().length >= 3 && (
        <View style={styles.dropdown}>
          {searchError ? (
            <Text style={styles.message}>{searchError}</Text>
          ) : loadingSuggestions ? (
            <Text style={styles.message}>Searching addresses…</Text>
          ) : suggestions.length === 0 ? (
            <Text style={styles.message}>No matching places found.</Text>
          ) : (
            suggestions.map((suggestion) => (
              <Pressable
                key={suggestion.placeId}
                onPress={() => void selectSuggestion(suggestion)}
                style={({ pressed }) => [
                  styles.suggestion,
                  pressed && styles.suggestionPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Select ${suggestion.description}`}
              >
                <View style={styles.pin}>
                  <Ionicons name="location-outline" size={19} color="#461477" />
                </View>
                <View style={styles.suggestionText}>
                  <Text style={styles.mainText}>
                    {suggestion.mainText}
                  </Text>
                  {!!suggestion.secondaryText && (
                    <Text style={styles.secondaryText}>
                      {suggestion.secondaryText}
                    </Text>
                  )}
                  {!suggestion.secondaryText && (
                    <Text style={styles.secondaryText}>
                      {suggestion.description}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={17} color="#9290A5" />
              </Pressable>
            ))
          )}
          <Text style={styles.attribution}>Powered by Google</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    zIndex: 10,
  },
  inputWrap: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#E5DDF0",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 10,
    color: "#191044",
    fontSize: 15,
  },
  dropdown: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#E5DDF0",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#191044",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  suggestion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 13,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5DDF0",
  },
  suggestionPressed: {
    backgroundColor: "#F8F6FC",
  },
  pin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0E9F8",
  },
  suggestionText: {
    flex: 1,
    gap: 3,
  },
  mainText: {
    color: "#191044",
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryText: {
    color: "#626782",
    fontSize: 12,
    lineHeight: 17,
  },
  message: {
    paddingHorizontal: 15,
    paddingVertical: 14,
    color: "#626782",
    fontSize: 13,
  },
  attribution: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    textAlign: "right",
    color: "#626782",
    fontSize: 10,
    backgroundColor: "#F8F6FC",
  },
});

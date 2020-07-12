/* global alert */
import React, { useEffect, useState } from 'react';
import { Platform, Dimensions, View, Keyboard, StatusBar, StyleSheet } from 'react-native';
import {
  BlueFormMultiInput,
  BlueButtonLink,
  BlueFormLabel,
  BlueDoneAndDismissKeyboardInputAccessory,
  BlueButton,
  SafeBlueArea,
  BlueSpacing20,
  BlueNavigationStyle,
} from '../../BlueComponents';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Privacy from '../../Privacy';
import { useNavigation, useRoute } from '@react-navigation/native';
import WalletImport from '../../class/wallet-import';
import Clipboard from '@react-native-community/clipboard';
import ActionSheet from '../ActionSheet';
import ImagePicker from 'react-native-image-picker';
const LocalQRCode = require('@remobile/react-native-qrcode-local-image');
const loc = require('../../loc');
const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
});

const WalletsImport = () => {
  const [isToolbarVisibleForAndroid, setIsToolbarVisibleForAndroid] = useState(false);
  const route = useRoute();
  const label = (route.params && route.params.label) || '';
  const [importText, setImportText] = useState(label);
  const navigation = useNavigation();

  useEffect(() => {
    Privacy.enableBlur();
    Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setIsToolbarVisibleForAndroid(true));
    Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setIsToolbarVisibleForAndroid(false));
    return () => {
      Keyboard.removeListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide');
      Keyboard.removeListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow');
      Privacy.disableBlur();
    };
  }, []);

  const importButtonPressed = () => {
    if (importText.trim().length === 0) {
      return;
    }
    importMnemonic(importText);
  };

  /**
   *
   * @param importText
   * @param additionalProperties key-values passed from outside. Used only to set up `masterFingerprint` property for watch-only wallet
   */
  const importMnemonic = (importText, additionalProperties) => {
    try {
      WalletImport.processImportText(importText, additionalProperties);
      navigation.dangerouslyGetParent().pop();
    } catch (error) {
      alert(loc.wallets.import.error);
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
    }
  };

  /**
   *
   * @param value
   * @param additionalProperties key-values passed from outside. Used only to set up `masterFingerprint` property for watch-only wallet
   */
  const onBarScanned = (value, additionalProperties) => {
    setImportText(value);
    importMnemonic(value, additionalProperties);
  };

  const importScan = () => {
    showActionSheet();
  };

  const choosePhoto = () => {
    ImagePicker.launchImageLibrary(
      {
        title: null,
        mediaType: 'photo',
        takePhotoButtonTitle: null,
      },
      response => {
        if (response.uri) {
          const uri = Platform.OS === 'ios' ? response.uri.toString().replace('file://', '') : response.path.toString();
          LocalQRCode.decode(uri, (error, result) => {
            if (!error) {
              onBarScanned(result);
            } else {
              alert('The selected image does not contain a QR Code.');
            }
          });
        }
      },
    );
  };

  const takePhoto = () => {
    ImagePicker.launchCamera(
      {
        title: null,
        mediaType: 'photo',
        takePhotoButtonTitle: null,
      },
      response => {
        if (response.uri) {
          const uri = Platform.OS === 'ios' ? response.uri.toString().replace('file://', '') : response.path.toString();
          LocalQRCode.decode(uri, (error, result) => {
            if (!error) {
              onBarScanned(result);
            } else {
              alert('The selected image does not contain a QR Code.');
            }
          });
        }
      },
    );
  };

  const copyFromClipbard = async () => {
    onBarScanned(await Clipboard.getString());
  };

  const showActionSheet = async () => {
    const isClipboardEmpty = (await Clipboard.getString()).replace(' ', '').length === 0;
    let copyFromClipboardIndex;
    if (Platform.OS === 'ios') {
      const options = [loc.send.details.cancel, 'Take Photo', 'Choose Photo'];
      if (!isClipboardEmpty) {
        options.push('Copy from Clipboard');
        copyFromClipboardIndex = options.length - 1;
      }

      ActionSheet.showActionSheetWithOptions({ options, cancelButtonIndex: 0 }, buttonIndex => {
        if (buttonIndex === 1) {
          takePhoto();
        } else if (buttonIndex === 2) {
          choosePhoto();
        } else if (buttonIndex === copyFromClipboardIndex) {
          copyFromClipbard();
        }
      });
    }
  };

  return (
    <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.root}>
      <StatusBar barStyle="light-content" />

      <BlueFormLabel>{loc.wallets.import.explanation}</BlueFormLabel>
      <BlueSpacing20 />
      <BlueFormMultiInput
        testID="MnemonicInput"
        value={importText}
        contextMenuHidden
        onChangeText={setImportText}
        inputAccessoryViewID={BlueDoneAndDismissKeyboardInputAccessory.InputAccessoryViewID}
      />

      <BlueSpacing20 />
      <View style={styles.center}>
        <BlueButton
          testID="DoImport"
          disabled={importText.trim().length === 0}
          title={loc.wallets.import.do_import}
          buttonStyle={{
            width: width / 1.5,
          }}
          onPress={importButtonPressed}
        />
        <BlueSpacing20 />
        <BlueButtonLink title={loc.wallets.import.scan_qr} onPress={importScan} />
      </View>
      {Platform.select({
        ios: (
          <BlueDoneAndDismissKeyboardInputAccessory
            onClearTapped={() => {
              setImportText('');
              Keyboard.dismiss();
            }}
            onPasteTapped={text => {
              setImportText(text);
              Keyboard.dismiss();
            }}
          />
        ),
        android: isToolbarVisibleForAndroid && (
          <BlueDoneAndDismissKeyboardInputAccessory
            onClearTapped={() => {
              setImportText('');
              Keyboard.dismiss();
            }}
            onPasteTapped={text => {
              setImportText(text);
              Keyboard.dismiss();
            }}
          />
        ),
      })}
    </SafeBlueArea>
  );
};

WalletsImport.navigationOptions = {
  ...BlueNavigationStyle(),
  title: loc.wallets.import.title,
};
export default WalletsImport;

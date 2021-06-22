import { image, trash, close } from "ionicons/icons";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonFab,
  IonFabButton,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonImg,
  IonActionSheet,
  IonButton,
} from "@ionic/react";
import { useState, useEffect } from "react";
import { isPlatform } from "@ionic/react";
import {
  Camera,
  CameraResultType,
  CameraSource,
  Photo,
} from "@capacitor/camera";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Storage } from "@capacitor/storage";
import { Capacitor } from "@capacitor/core";
import "./Tab2.css";

const PHOTO_STORAGE = "photos";

async function base64FromPath(path) {
  const response = await fetch(path);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject("method did not return a string");
      }
    };
    reader.readAsDataURL(blob);
  });
}

const savePicture = async (cameraPhoto, fileName) => {
  let base64Data;
  // "hybrid" will detect Cordova or Capacitor;
  if (isPlatform("hybrid")) {
    const file = await Filesystem.readFile({
      path: cameraPhoto.path,
    });
    base64Data = file.data;
  } else {
    base64Data = await base64FromPath(cameraPhoto.webPath);
  }
  const savedFile = await Filesystem.writeFile({
    path: fileName,
    data: base64Data,
    directory: Directory.Data,
  });

  if (isPlatform("hybrid")) {
    // Display the new image by rewriting the 'file://' path to HTTP
    // Details: https://ionicframework.com/docs/building/webview#file-protocol
    return {
      filepath: savedFile.uri,
      webviewPath: Capacitor.convertFileSrc(savedFile.uri),
    };
  } else {
    // Use webPath to display the new image instead of base64 since it's
    // already loaded into memory
    return {
      filepath: fileName,
      webviewPath: cameraPhoto.webPath,
    };
  }
};

const takePhoto = async () => {
  const cameraPhoto = await Camera.getPhoto({
    resultType: CameraResultType.Uri,
    source: CameraSource.Photos,
    quality: 100,
    presentationStyle: "popover",
  });
  console.log(cameraPhoto);
  const fileName = new Date().getTime() + "." + cameraPhoto.format;
  const takenPhoto = await savePicture(cameraPhoto, fileName);
  return takenPhoto;
};

const Tab2 = () => {
  const [photos, setPhotos] = useState([]);
  const [photoToDelete, setPhotoToDelete] = useState();

  useEffect(() => {
    const loadSaved = async () => {
      const { value } = await Storage.get({ key: PHOTO_STORAGE });
      const photosInStorage = value ? JSON.parse(value) : [];

      if (!isPlatform("hybrid")) {
        for (let photo of photosInStorage) {
          const file = await Filesystem.readFile({
            path: photo.filepath,
            directory: Directory.Data,
          });
          // Web platform only: Load the photo as base64 data
          photo.webviewPath = `data:image/jpeg;base64,${file.data}`;
        }
      }
      setPhotos(photosInStorage);
    };
    loadSaved();
  }, []);

  const handleTakePhoto = async () => {
    try {
      const photo = await takePhoto();
      const newPhotos = [photo, ...photos];
      Storage.set({ key: PHOTO_STORAGE, value: JSON.stringify(newPhotos) });
      setPhotos(newPhotos);
    } catch (e) {
      console.log(e.message);
    }
  };

  const handleDeletePhoto = async (photo) => {
    // Remove this photo from the Photos reference data array
    const newPhotos = photos.filter((p) => p.filepath !== photo.filepath);

    // Update photos array cache by overwriting the existing photo array
    Storage.set({ key: PHOTO_STORAGE, value: JSON.stringify(newPhotos) });

    // delete photo file from filesystem
    const filename = photo.filepath.substr(photo.filepath.lastIndexOf("/") + 1);
    await Filesystem.deleteFile({
      path: filename,
      directory: Directory.Data,
    });
    setPhotos(newPhotos);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Photo Gallery</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonGrid>
          <IonRow>
            {photos.map((photo, index) => (
              <IonCol size="6" key={photo.webviewPath}>
                <IonImg
                  src={photo.webviewPath}
                  className={
                    photoToDelete &&
                    photoToDelete.webviewPath === photo.webviewPath &&
                    "photo-to-delete"
                  }
                />
                <IonButton
                  // fill="clear"
                  className={"button"}
                  onClick={() => {
                    setPhotoToDelete(photo);
                  }}
                >
                  <IonIcon
                    className={"button-icon"}
                    slot="icon-only"
                    icon={trash}
                  />
                </IonButton>
              </IonCol>
            ))}
          </IonRow>
        </IonGrid>
        <IonActionSheet
          isOpen={!!photoToDelete}
          buttons={[
            {
              text: "Delete",
              role: "destructive",
              icon: trash,
              handler: () => {
                if (photoToDelete) {
                  handleDeletePhoto(photoToDelete);
                  setPhotoToDelete(undefined);
                }
              },
            },
            {
              text: "Cancel",
              icon: close,
              role: "cancel",
            },
          ]}
          onDidDismiss={() => setPhotoToDelete(undefined)}
        />
        <IonFab vertical="bottom" horizontal="center" slot="fixed">
          <IonFabButton onClick={() => handleTakePhoto()}>
            <IonIcon icon={image}></IonIcon>
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};

export default Tab2;

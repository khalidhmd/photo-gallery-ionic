import { camera, trash, close } from "ionicons/icons";
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
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Storage } from "@capacitor/storage";
import { Capacitor } from "@capacitor/core";
import "./Tab2.css";

const PHOTO_STORAGE = "photos";

const takePhoto = async () => {
  const cameraPhoto = await Camera.getPhoto({
    resultType: CameraResultType.Uri,
    source: CameraSource.Photos,
    quality: 100,
    presentationStyle: "popover",
  });
  const fileName = new Date().getTime() + "." + cameraPhoto.format;

  Filesystem.copy({
    from: cameraPhoto.path,
    to: fileName,
    toDirectory: Directory.Data,
  });

  const finalPhotoUri = await Filesystem.getUri({
    directory: Directory.Data,
    path: fileName,
  });

  let webviewPath = Capacitor.convertFileSrc(finalPhotoUri.uri);

  return { webviewPath };
};

const Tab2 = () => {
  const [photos, setPhotos] = useState([]);
  const [photoToDelete, setPhotoToDelete] = useState();

  useEffect(() => {
    const loadSaved = async () => {
      const { value } = await Storage.get({ key: PHOTO_STORAGE });
      const photosInStorage = value ? JSON.parse(value) : [];
      console.log(photosInStorage);
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
    const newPhotos = photos.filter((p) => p.webviewPath !== photo.webviewPath);

    // Update photos array cache by overwriting the existing photo array
    Storage.set({ key: PHOTO_STORAGE, value: JSON.stringify(newPhotos) });

    // delete photo file from filesystem
    const filename = photo.webviewPath.substr(
      photo.webviewPath.lastIndexOf("/") + 1
    );
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
            <IonIcon icon={camera}></IonIcon>
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};

export default Tab2;

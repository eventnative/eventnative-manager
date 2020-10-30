import {Project, User} from "./model";
import * as firebase from "firebase/app";
import 'firebase/auth'
import 'firebase/firestore'
import Marshal from "../commons/marshalling";
import {randomId} from "../commons/utils";
import {ServerStorage, setDebugInfo, UserLoginStatus, UserService} from "./ApplicationServices";

export class FirebaseUserService implements UserService {
    private user?: User
    private unregisterAuthObserver: firebase.Unsubscribe;
    private firebaseUser: firebase.User;

    initiateGithubLogin(redirect?: string) {
        return new Promise<void>(((resolve, reject) => {
            firebase.auth().signInWithPopup(new firebase.auth.GithubAuthProvider())
                .then((a) => {
                    resolve();
                })
                .catch((error) => {
                    reject(error);
                });
        }));
    }

    initiateGoogleLogin(redirect?: string): Promise<void> {
        return new Promise<void>(((resolve, reject) => {
            firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider())
                .then((a) => {
                    resolve();
                })
                .catch((error) => {
                    reject(error);
                });
        }));
    }

    login(email: string, password: string): Promise<any> {
        let fbLogin = firebase.auth().signInWithEmailAndPassword(email, password);
        return new Promise<any>((resolve, reject) => {
            fbLogin.then((login) => resolve(login)).catch((error) => reject(error));
        })
    }


    public waitForUser(): Promise<UserLoginStatus> {
        let fbUserPromise = new Promise<firebase.User>((resolve, reject) => {
            let unregister = firebase.auth().onAuthStateChanged((user: firebase.User) => {
                if (user) {
                    this.firebaseUser = user;
                    setDebugInfo('firebaseUser', user);
                    setDebugInfo('updateEmail', async (email) => {
                        try {
                            let updateResult = await user.updateEmail(email);
                            console.log(`Attempt to update email to ${email}. Result`, updateResult)
                        } catch (e) {
                            console.log(`Attempt to update email to ${email} failed`, e)
                        }
                    }, false)
                    resolve(user)
                } else {
                    resolve(null)
                }
                unregister();
            }, error => {
                reject(error);
            })
        });
        return fbUserPromise.then((user: firebase.User) => {
            if (user != null) {
                return this.restoreUser(user).then((user) => {
                    return {user: user, loggedIn: true, loginErrorMessage: null}
                })
            } else {
                return {user: null, loggedIn: false, loginErrorMessage: null}
            }
        });
    }

    private static readonly USERS_COLLECTION = "users_info";

    private async restoreUser(user: firebase.User): Promise<User> {

        let userInfo = await firebase.firestore().collection(FirebaseUserService.USERS_COLLECTION).doc(user.uid).get();
        let userToken = await user.getIdToken(false);
        let suggestedInfo = {
            email: user.email,
            name: user.displayName,
        };
        if (userInfo.exists) {
            return this.user = new User(user.uid, userToken, suggestedInfo, userInfo.data());
        } else {
            this.user = new User(user.uid, userToken, suggestedInfo);
            this.user.created = new Date();
        }
    }
    removeAuth(callback: () => void) {
        firebase.auth().signOut().then(callback).catch(callback);
    }



    getUser(): User {
        if (!this.user) {
            throw new Error("User is null")
        }
        return this.user;
    }

    update(user: User): Promise<void> {
        return new Promise<void>(((resolve, reject) => {
            if (user.projects == null) {
                reject(new Error(`Can't update user without projects:` + JSON.stringify(user)));
            }
            if (user.projects.length != 1) {
                reject(new Error(`Can't update user projects ( ` + user.projects.length + `), should be 1` + JSON.stringify(user)));
            }
            let userData: any = Marshal.toPureJson(user)
            userData['_project'] = Marshal.toPureJson(user.projects[0]);
            delete userData['_projects']
            return firebase.firestore().collection(FirebaseUserService.USERS_COLLECTION).doc(user.uid).set(userData, {merge: true}).then(resolve);
        }))
    }

    sendPasswordReset(email?: string): Promise<void> {
        return firebase.auth().sendPasswordResetEmail(email ? email : this.getUser().email);
    }

    async createUser(email: string, password: string): Promise<void> {
        let firebaseUser = await firebase.auth().createUserWithEmailAndPassword(email.trim(), password.trim());
        let token = await firebaseUser.user.getIdToken(false);
        let user = new User(firebaseUser.user.uid, token, {name: null, email: email}, {
            "_name": name,
            "_project": new Project(randomId(), null)
        });
        await this.update(user);
    }

    hasUser(): boolean {
        return !!this.user;
    }

    changePassword(newPassword: any): Promise<void> {
        return this.firebaseUser.updatePassword(newPassword)
    }


}

export class FirebaseServerStorage implements ServerStorage {


    get(collectionName: string, key?: string): Promise<any> {
        if (!key) {
            key = firebase.auth().currentUser.uid;
        }
        return firebase.firestore().collection(collectionName).doc(key).get().then((doc) => doc.data())
    }

    save(collectionName: string, data: any, key?: string): Promise<void> {
        if (!key) {
            key = firebase.auth().currentUser.uid;
        }
        let pureJson = Marshal.toPureJson(data);
        pureJson['_lastUpdated'] = new Date().toISOString();
        console.log("Saving to storage: " + key + " = ", pureJson)
        return firebase.firestore().collection(collectionName).doc(key).set(pureJson)
    }
}

export function firebaseInit(config: any) {
    firebase.initializeApp(config);
    if (window) {
        window.firebase = firebase;
    }
}